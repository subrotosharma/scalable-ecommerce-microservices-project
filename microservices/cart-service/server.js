const express = require('express');
const redis = require('redis');
const cors = require('cors');
const helmet = require('helmet');
const { authenticateToken } = require('../middleware/auth');

const app = express();
const port = process.env.PORT || 8080;

app.use(helmet());
app.use(cors());
app.use(express.json());

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: 6379
});

redisClient.connect();

app.post('/api/cart/:userId/items', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { productId, quantity, price } = req.body;
    
    const cartKey = `cart:${userId}`;
    const item = { productId, quantity, price, addedAt: new Date().toISOString() };
    
    await redisClient.hSet(cartKey, productId, JSON.stringify(item));
    await redisClient.expire(cartKey, 86400); // 24 hours
    
    res.status(201).json({ message: 'Item added to cart', item });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/cart/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const cartKey = `cart:${userId}`;
    
    const cartItems = await redisClient.hGetAll(cartKey);
    const items = Object.entries(cartItems).map(([productId, itemData]) => ({
      productId,
      ...JSON.parse(itemData)
    }));
    
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    res.json({ items, totalAmount, itemCount: items.length });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/cart/:userId/items/:productId', async (req, res) => {
  try {
    const { userId, productId } = req.params;
    const { quantity } = req.body;
    
    const cartKey = `cart:${userId}`;
    const existingItem = await redisClient.hGet(cartKey, productId);
    
    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }
    
    const item = JSON.parse(existingItem);
    item.quantity = quantity;
    
    await redisClient.hSet(cartKey, productId, JSON.stringify(item));
    
    res.json({ message: 'Cart updated', item });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/cart/:userId/items/:productId', async (req, res) => {
  try {
    const { userId, productId } = req.params;
    const cartKey = `cart:${userId}`;
    
    await redisClient.hDel(cartKey, productId);
    
    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/cart/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const cartKey = `cart:${userId}`;
    
    await redisClient.del(cartKey);
    
    res.json({ message: 'Cart cleared' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'cart-service' });
});

app.listen(port, () => {
  console.log(`Cart service running on port ${port}`);
});