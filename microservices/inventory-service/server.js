const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const port = process.env.PORT || 8080;

app.use(helmet());
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME || 'inventorydb',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

app.get('/api/inventory/:productId', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory WHERE product_id = $1', [req.params.productId]);
    res.json(result.rows[0] || { productId: req.params.productId, stock: 0 });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/inventory/:productId', async (req, res) => {
  try {
    const { stock } = req.body;
    const result = await pool.query(
      'INSERT INTO inventory (product_id, stock) VALUES ($1, $2) ON CONFLICT (product_id) DO UPDATE SET stock = $2 RETURNING *',
      [req.params.productId, stock]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/inventory/:productId/reserve', async (req, res) => {
  try {
    const { quantity } = req.body;
    const result = await pool.query(
      'UPDATE inventory SET stock = stock - $1 WHERE product_id = $2 AND stock >= $1 RETURNING *',
      [quantity, req.params.productId]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'inventory-service' });
});

app.listen(port, () => {
  console.log(`Inventory service running on port ${port}`);
});