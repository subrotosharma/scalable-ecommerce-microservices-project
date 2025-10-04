const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const port = process.env.PORT || 8080;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock search data - in production, use Elasticsearch
const mockProducts = [
  { id: 1, name: 'iPhone 15', category: 'electronics', price: 999 },
  { id: 2, name: 'Samsung TV', category: 'electronics', price: 799 },
  { id: 3, name: 'Nike Shoes', category: 'fashion', price: 129 }
];

app.get('/api/search', async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, page = 1, limit = 10 } = req.query;
    
    let results = mockProducts;
    
    if (q) {
      results = results.filter(p => 
        p.name.toLowerCase().includes(q.toLowerCase())
      );
    }
    
    if (category) {
      results = results.filter(p => p.category === category);
    }
    
    if (minPrice) {
      results = results.filter(p => p.price >= parseInt(minPrice));
    }
    
    if (maxPrice) {
      results = results.filter(p => p.price <= parseInt(maxPrice));
    }
    
    const startIndex = (page - 1) * limit;
    const paginatedResults = results.slice(startIndex, startIndex + parseInt(limit));
    
    res.json({
      products: paginatedResults,
      total: results.length,
      page: parseInt(page),
      totalPages: Math.ceil(results.length / limit)
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/search/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    
    const suggestions = mockProducts
      .filter(p => p.name.toLowerCase().includes(q.toLowerCase()))
      .map(p => p.name)
      .slice(0, 5);
    
    res.json({ suggestions });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/search/categories', async (req, res) => {
  try {
    const categories = [...new Set(mockProducts.map(p => p.category))];
    res.json({ categories });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'search-service' });
});

app.listen(port, () => {
  console.log(`Search service running on port ${port}`);
});