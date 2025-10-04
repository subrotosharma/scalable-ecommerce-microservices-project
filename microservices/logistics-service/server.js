const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const port = process.env.PORT || 8080;

app.use(helmet());
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME || 'logisticsdb',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

// Create shipment
app.post('/api/logistics/shipments', async (req, res) => {
  try {
    const { orderId, carrierId, shippingAddress, items, weight, dimensions } = req.body;
    
    // Calculate shipping cost based on weight and distance
    const shippingCost = calculateShippingCost(weight, shippingAddress);
    
    // Generate tracking number
    const trackingNumber = generateTrackingNumber();
    
    const result = await pool.query(`
      INSERT INTO shipments (order_id, carrier_id, tracking_number, shipping_address, items, weight, dimensions, shipping_cost, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'created')
      RETURNING *
    `, [orderId, carrierId, trackingNumber, JSON.stringify(shippingAddress), JSON.stringify(items), weight, JSON.stringify(dimensions), shippingCost]);
    
    // Create initial tracking event
    await pool.query(`
      INSERT INTO tracking_events (shipment_id, status, location, description, timestamp)
      VALUES ($1, 'created', 'Warehouse', 'Shipment created', NOW())
    `, [result.rows[0].id]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Track shipment
app.get('/api/logistics/track/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    
    const shipment = await pool.query(`
      SELECT s.*, c.name as carrier_name
      FROM shipments s
      JOIN carriers c ON s.carrier_id = c.id
      WHERE s.tracking_number = $1
    `, [trackingNumber]);
    
    if (shipment.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    const events = await pool.query(`
      SELECT * FROM tracking_events
      WHERE shipment_id = $1
      ORDER BY timestamp DESC
    `, [shipment.rows[0].id]);
    
    res.json({
      shipment: shipment.rows[0],
      trackingEvents: events.rows,
      estimatedDelivery: calculateEstimatedDelivery(shipment.rows[0])
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update shipment status
app.put('/api/logistics/shipments/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, location, description } = req.body;
    
    // Update shipment status
    await pool.query(`
      UPDATE shipments SET status = $1, updated_at = NOW()
      WHERE id = $2
    `, [status, id]);
    
    // Add tracking event
    await pool.query(`
      INSERT INTO tracking_events (shipment_id, status, location, description, timestamp)
      VALUES ($1, $2, $3, $4, NOW())
    `, [id, status, location, description]);
    
    // Notify customer if delivered
    if (status === 'delivered') {
      // Call notification service
      try {
        await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/api/notifications/delivery`, {
          shipmentId: id,
          status: 'delivered'
        });
      } catch (notificationError) {
        console.error('Notification error:', notificationError.message);
      }
    }
    
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get shipping rates
app.post('/api/logistics/rates', async (req, res) => {
  try {
    const { fromAddress, toAddress, weight, dimensions } = req.body;
    
    const carriers = await pool.query('SELECT * FROM carriers WHERE active = true');
    
    const rates = carriers.rows.map(carrier => ({
      carrierId: carrier.id,
      carrierName: carrier.name,
      service: carrier.service_type,
      cost: calculateShippingCost(weight, toAddress, carrier.rate_multiplier),
      estimatedDays: carrier.estimated_days,
      trackingIncluded: carrier.tracking_included
    }));
    
    res.json({ rates });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get delivery analytics
app.get('/api/logistics/analytics', async (req, res) => {
  try {
    const [onTimeDeliveries, avgDeliveryTime, topCarriers] = await Promise.all([
      pool.query(`
        SELECT 
          COUNT(CASE WHEN actual_delivery <= estimated_delivery THEN 1 END) * 100.0 / COUNT(*) as on_time_percentage
        FROM shipments 
        WHERE status = 'delivered' AND created_at >= NOW() - INTERVAL '30 days'
      `),
      pool.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (actual_delivery - created_at))/86400) as avg_days
        FROM shipments 
        WHERE status = 'delivered' AND created_at >= NOW() - INTERVAL '30 days'
      `),
      pool.query(`
        SELECT 
          c.name,
          COUNT(s.id) as shipment_count,
          AVG(EXTRACT(EPOCH FROM (s.actual_delivery - s.created_at))/86400) as avg_delivery_days
        FROM carriers c
        JOIN shipments s ON c.id = s.carrier_id
        WHERE s.status = 'delivered' AND s.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY c.id, c.name
        ORDER BY shipment_count DESC
        LIMIT 5
      `)
    ]);
    
    res.json({
      onTimePercentage: parseFloat(onTimeDeliveries.rows[0]?.on_time_percentage || 0).toFixed(2),
      avgDeliveryDays: parseFloat(avgDeliveryTime.rows[0]?.avg_days || 0).toFixed(1),
      topCarriers: topCarriers.rows
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

function calculateShippingCost(weight, address, multiplier = 1) {
  const baseRate = 5.99;
  const weightRate = weight * 0.5;
  const distanceRate = address.country === 'US' ? 0 : 10;
  return ((baseRate + weightRate + distanceRate) * multiplier).toFixed(2);
}

function generateTrackingNumber() {
  return 'TRK' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
}

function calculateEstimatedDelivery(shipment) {
  const created = new Date(shipment.created_at);
  const estimatedDays = 3; // Default 3 days
  const estimated = new Date(created.getTime() + (estimatedDays * 24 * 60 * 60 * 1000));
  return estimated.toISOString();
}

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'logistics-service' });
});

app.listen(port, () => {
  console.log(`Logistics service running on port ${port}`);
});