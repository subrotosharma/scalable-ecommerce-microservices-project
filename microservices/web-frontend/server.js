const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const port = process.env.PORT || 8080;

app.use(helmet());
app.use(cors());
app.use(express.static('public'));

const apiGatewayUrl = process.env.API_GATEWAY_URL || 'http://api-gateway:80';

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>MarketPlace Pro - Professional E-commerce Platform</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; }
            
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1rem 0; }
            .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; padding: 0 2rem; }
            .logo { font-size: 1.8rem; font-weight: bold; }
            .search-bar { flex: 1; max-width: 500px; margin: 0 2rem; position: relative; }
            .search-bar input { width: 100%; padding: 0.8rem; border: none; border-radius: 25px; font-size: 1rem; }
            .search-btn { position: absolute; right: 5px; top: 50%; transform: translateY(-50%); background: #ff6b6b; border: none; padding: 0.6rem 1rem; border-radius: 20px; color: white; cursor: pointer; }
            .user-actions { display: flex; gap: 1rem; align-items: center; }
            .user-actions a { color: white; text-decoration: none; padding: 0.5rem 1rem; border-radius: 5px; transition: background 0.3s; }
            .user-actions a:hover { background: rgba(255,255,255,0.1); }
            .cart-icon { position: relative; }
            .cart-count { position: absolute; top: -8px; right: -8px; background: #ff6b6b; color: white; border-radius: 50%; width: 20px; height: 20px; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; }
            
            .nav { background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 1rem 0; }
            .nav-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; padding: 0 2rem; }
            .nav-links { display: flex; gap: 2rem; }
            .nav-links a { text-decoration: none; color: #333; font-weight: 500; transition: color 0.3s; }
            .nav-links a:hover { color: #667eea; }
            .categories { display: flex; gap: 1rem; }
            .category-btn { background: #f8f9fa; border: 1px solid #dee2e6; padding: 0.5rem 1rem; border-radius: 20px; text-decoration: none; color: #495057; transition: all 0.3s; }
            .category-btn:hover { background: #667eea; color: white; }
            
            .hero { background: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600"><rect fill="%23667eea" width="1200" height="600"/></svg>'); background-size: cover; color: white; text-align: center; padding: 4rem 2rem; }
            .hero h1 { font-size: 3rem; margin-bottom: 1rem; }
            .hero p { font-size: 1.2rem; margin-bottom: 2rem; }
            .cta-btn { background: #ff6b6b; color: white; padding: 1rem 2rem; border: none; border-radius: 25px; font-size: 1.1rem; cursor: pointer; transition: transform 0.3s; }
            .cta-btn:hover { transform: translateY(-2px); }
            
            .features { padding: 4rem 2rem; background: #f8f9fa; }
            .features-content { max-width: 1200px; margin: 0 auto; }
            .features h2 { text-align: center; margin-bottom: 3rem; font-size: 2.5rem; color: #333; }
            .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
            .feature-card { background: white; padding: 2rem; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; transition: transform 0.3s; }
            .feature-card:hover { transform: translateY(-5px); }
            .feature-icon { font-size: 3rem; color: #667eea; margin-bottom: 1rem; }
            
            .products { padding: 4rem 2rem; }
            .products-content { max-width: 1200px; margin: 0 auto; }
            .products h2 { text-align: center; margin-bottom: 3rem; font-size: 2.5rem; color: #333; }
            .product-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; }
            .product-card { background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.3s; }
            .product-card:hover { transform: translateY(-5px); }
            .product-image { height: 200px; background: linear-gradient(45deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: white; font-size: 3rem; }
            .product-info { padding: 1.5rem; }
            .product-title { font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem; }
            .product-price { font-size: 1.5rem; color: #ff6b6b; font-weight: bold; margin-bottom: 1rem; }
            .product-rating { color: #ffc107; margin-bottom: 1rem; }
            .add-to-cart { width: 100%; background: #667eea; color: white; border: none; padding: 0.8rem; border-radius: 5px; font-size: 1rem; cursor: pointer; transition: background 0.3s; }
            .add-to-cart:hover { background: #5a6fd8; }
            
            .footer { background: #333; color: white; padding: 3rem 2rem 1rem; }
            .footer-content { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; }
            .footer-section h3 { margin-bottom: 1rem; }
            .footer-section a { color: #ccc; text-decoration: none; display: block; margin-bottom: 0.5rem; }
            .footer-section a:hover { color: white; }
            .footer-bottom { text-align: center; margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #555; }
            
            @media (max-width: 768px) {
                .header-content { flex-direction: column; gap: 1rem; }
                .search-bar { max-width: 100%; }
                .nav-content { flex-direction: column; gap: 1rem; }
                .hero h1 { font-size: 2rem; }
                .categories { flex-wrap: wrap; }
            }
        </style>
    </head>
    <body>
        <header class="header">
            <div class="header-content">
                <div class="logo"><i class="fas fa-store"></i> MarketPlace Pro</div>
                <div class="search-bar">
                    <input type="text" placeholder="Search for products, brands, categories..." id="searchInput">
                    <button class="search-btn" onclick="search()"><i class="fas fa-search"></i></button>
                </div>
                <div class="user-actions">
                    <a href="/account"><i class="fas fa-user"></i> Account</a>
                    <a href="/orders"><i class="fas fa-box"></i> Orders</a>
                    <a href="/cart" class="cart-icon">
                        <i class="fas fa-shopping-cart"></i> Cart
                        <span class="cart-count" id="cartCount">0</span>
                    </a>
                </div>
            </div>
        </header>
        
        <nav class="nav">
            <div class="nav-content">
                <div class="nav-links">
                    <a href="/">Home</a>
                    <a href="/deals">Today's Deals</a>
                    <a href="/bestsellers">Best Sellers</a>
                    <a href="/new-arrivals">New Arrivals</a>
                    <a href="/seller">Sell on MarketPlace</a>
                </div>
                <div class="categories">
                    <a href="/category/electronics" class="category-btn">Electronics</a>
                    <a href="/category/fashion" class="category-btn">Fashion</a>
                    <a href="/category/home" class="category-btn">Home & Garden</a>
                    <a href="/category/sports" class="category-btn">Sports</a>
                </div>
            </div>
        </nav>
        
        <section class="hero">
            <h1>Welcome to MarketPlace Pro</h1>
            <p>Discover millions of products from trusted sellers worldwide</p>
            <button class="cta-btn" onclick="exploreProducts()">Start Shopping</button>
        </section>
        
        <section class="features">
            <div class="features-content">
                <h2>Why Choose MarketPlace Pro?</h2>
                <div class="features-grid">
                    <div class="feature-card">
                        <div class="feature-icon"><i class="fas fa-shipping-fast"></i></div>
                        <h3>Fast Delivery</h3>
                        <p>Free shipping on orders over $50. Same-day delivery available in select cities.</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon"><i class="fas fa-shield-alt"></i></div>
                        <h3>Secure Shopping</h3>
                        <p>Advanced fraud detection and secure payment processing for your peace of mind.</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon"><i class="fas fa-headset"></i></div>
                        <h3>24/7 Support</h3>
                        <p>Our customer service team is available around the clock to help you.</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon"><i class="fas fa-undo"></i></div>
                        <h3>Easy Returns</h3>
                        <p>30-day return policy with free return shipping on most items.</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon"><i class="fas fa-star"></i></div>
                        <h3>Quality Guaranteed</h3>
                        <p>All products are verified by our quality assurance team before shipping.</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon"><i class="fas fa-mobile-alt"></i></div>
                        <h3>Mobile App</h3>
                        <p>Shop on the go with our mobile app. Available on iOS and Android.</p>
                    </div>
                </div>
            </div>
        </section>
        
        <section class="products">
            <div class="products-content">
                <h2>Featured Products</h2>
                <div class="product-grid" id="productGrid">
                    <!-- Products will be loaded here -->
                </div>
            </div>
        </section>
        
        <footer class="footer">
            <div class="footer-content">
                <div class="footer-section">
                    <h3>Customer Service</h3>
                    <a href="/help">Help Center</a>
                    <a href="/contact">Contact Us</a>
                    <a href="/returns">Returns & Refunds</a>
                    <a href="/shipping">Shipping Info</a>
                </div>
                <div class="footer-section">
                    <h3>About Us</h3>
                    <a href="/about">Our Story</a>
                    <a href="/careers">Careers</a>
                    <a href="/press">Press Center</a>
                    <a href="/sustainability">Sustainability</a>
                </div>
                <div class="footer-section">
                    <h3>Sell With Us</h3>
                    <a href="/seller-signup">Start Selling</a>
                    <a href="/seller-help">Seller Help</a>
                    <a href="/seller-university">Seller University</a>
                    <a href="/advertising">Advertising</a>
                </div>
                <div class="footer-section">
                    <h3>Connect</h3>
                    <a href="#"><i class="fab fa-facebook"></i> Facebook</a>
                    <a href="#"><i class="fab fa-twitter"></i> Twitter</a>
                    <a href="#"><i class="fab fa-instagram"></i> Instagram</a>
                    <a href="#"><i class="fab fa-youtube"></i> YouTube</a>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2024 MarketPlace Pro. All rights reserved. | Privacy Policy | Terms of Service</p>
            </div>
        </footer>
        
        <script>
            const API_BASE = '${apiGatewayUrl}';
            let cart = JSON.parse(localStorage.getItem('cart')) || [];
            
            // Update cart count
            function updateCartCount() {
                document.getElementById('cartCount').textContent = cart.length;
            }
            
            // Load featured products
            async function loadFeaturedProducts() {
                const products = [
                    { id: 1, name: 'iPhone 15 Pro', price: 999, rating: 4.8, image: '📱' },
                    { id: 2, name: 'Samsung 4K TV', price: 799, rating: 4.6, image: '📺' },
                    { id: 3, name: 'Nike Air Max', price: 129, rating: 4.7, image: '👟' },
                    { id: 4, name: 'MacBook Pro', price: 1999, rating: 4.9, image: '💻' },
                    { id: 5, name: 'AirPods Pro', price: 249, rating: 4.5, image: '🎧' },
                    { id: 6, name: 'Gaming Chair', price: 299, rating: 4.4, image: '🪑' }
                ];
                
                const grid = document.getElementById('productGrid');
                grid.innerHTML = products.map(product => `
                    <div class="product-card">
                        <div class="product-image">${product.image}</div>
                        <div class="product-info">
                            <div class="product-title">${product.name}</div>
                            <div class="product-price">$${product.price}</div>
                            <div class="product-rating">
                                ${'★'.repeat(Math.floor(product.rating))} ${product.rating}
                            </div>
                            <button class="add-to-cart" onclick="addToCart(${product.id}, '${product.name}', ${product.price})">
                                Add to Cart
                            </button>
                        </div>
                    </div>
                `).join('');
            }
            
            function addToCart(id, name, price) {
                cart.push({ id, name, price });
                localStorage.setItem('cart', JSON.stringify(cart));
                updateCartCount();
                
                // Show success message
                const btn = event.target;
                const originalText = btn.textContent;
                btn.textContent = 'Added!';
                btn.style.background = '#28a745';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '#667eea';
                }, 1000);
            }
            
            function search() {
                const query = document.getElementById('searchInput').value;
                if (query) {
                    window.location.href = \`/search?q=\${encodeURIComponent(query)}\`;
                }
            }
            
            function exploreProducts() {
                document.querySelector('.products').scrollIntoView({ behavior: 'smooth' });
            }
            
            // Initialize
            updateCartCount();
            loadFeaturedProducts();
            
            // Search on Enter key
            document.getElementById('searchInput').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    search();
                }
            });
        </script>
    </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'web-frontend' });
});

app.listen(port, () => {
  console.log(`Web frontend running on port ${port}`);
});