const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const port = process.env.PORT || 8080;

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);

const services = {
  user: process.env.USER_SERVICE_URL || 'http://user-service:80',
  product: process.env.PRODUCT_SERVICE_URL || 'http://product-service:80',
  order: process.env.ORDER_SERVICE_URL || 'http://order-service:80',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:80',
  cart: process.env.CART_SERVICE_URL || 'http://cart-service:80',
  inventory: process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:80',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:80',
  review: process.env.REVIEW_SERVICE_URL || 'http://review-service:80',
  search: process.env.SEARCH_SERVICE_URL || 'http://search-service:80'
};

// Route to services
app.use('/api/users', createProxyMiddleware({
  target: services.user,
  changeOrigin: true
}));

app.use('/api/products', createProxyMiddleware({
  target: services.product,
  changeOrigin: true
}));

app.use('/api/orders', createProxyMiddleware({
  target: services.order,
  changeOrigin: true
}));

app.use('/api/payments', createProxyMiddleware({
  target: services.payment,
  changeOrigin: true
}));

app.use('/api/cart', createProxyMiddleware({
  target: services.cart,
  changeOrigin: true
}));

app.use('/api/inventory', createProxyMiddleware({
  target: services.inventory,
  changeOrigin: true
}));

app.use('/api/notifications', createProxyMiddleware({
  target: services.notification,
  changeOrigin: true
}));

app.use('/api/reviews', createProxyMiddleware({
  target: services.review,
  changeOrigin: true
}));

app.use('/api/search', createProxyMiddleware({
  target: services.search,
  changeOrigin: true
}));

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'api-gateway' });
});

app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'running',
    services: Object.keys(services),
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`API Gateway running on port ${port}`);
});