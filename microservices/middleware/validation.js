const validatePayment = (req, res, next) => {
  const { orderId, amount, userId } = req.body;
  
  if (!orderId || !amount || !userId) {
    return res.status(400).json({ error: 'orderId, amount, and userId are required' });
  }
  
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }
  
  next();
};

const validateOrder = (req, res, next) => {
  const { userId, items, totalAmount } = req.body;
  
  if (!userId || !items || !totalAmount) {
    return res.status(400).json({ error: 'userId, items, and totalAmount are required' });
  }
  
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }
  
  next();
};

module.exports = { validatePayment, validateOrder };