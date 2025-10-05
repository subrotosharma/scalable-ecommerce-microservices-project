// Global variables
let currentUser = null;
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
let currentProduct = null;

// Categories data with 50+ categories
const categories = [
    { id: 'electronics', name: 'Electronics', icon: 'fas fa-laptop', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200&h=200&fit=crop' },
    { id: 'computers', name: 'Computers & Accessories', icon: 'fas fa-desktop', image: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=200&h=200&fit=crop' },
    { id: 'mobile', name: 'Mobile Phones & Accessories', icon: 'fas fa-mobile-alt', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&h=200&fit=crop' },
    { id: 'home-kitchen', name: 'Home & Kitchen', icon: 'fas fa-home', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop' },
    { id: 'furniture', name: 'Furniture', icon: 'fas fa-couch', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=200&fit=crop' },
    { id: 'appliances', name: 'Appliances', icon: 'fas fa-blender', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop' },
    { id: 'beauty', name: 'Beauty & Personal Care', icon: 'fas fa-spa', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop' },
    { id: 'health', name: 'Health & Household', icon: 'fas fa-heartbeat', image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=200&h=200&fit=crop' },
    { id: 'clothing', name: 'Clothing, Shoes & Jewelry', icon: 'fas fa-tshirt', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=200&h=200&fit=crop' },
    { id: 'watches', name: 'Watches', icon: 'fas fa-clock', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200&h=200&fit=crop' },
    { id: 'bags', name: 'Bags & Luggage', icon: 'fas fa-suitcase', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&h=200&fit=crop' },
    { id: 'sports', name: 'Sports & Outdoors', icon: 'fas fa-football-ball', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop' },
    { id: 'toys', name: 'Toys & Games', icon: 'fas fa-gamepad', image: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=200&h=200&fit=crop' },
    { id: 'baby', name: 'Baby & Kids', icon: 'fas fa-baby', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200&h=200&fit=crop' },
    { id: 'books', name: 'Books', icon: 'fas fa-book', image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=200&h=200&fit=crop' },
    { id: 'movies', name: 'Movies, Music & Games', icon: 'fas fa-film', image: 'https://images.unsplash.com/photo-1489599735734-79b4169f2a78?w=200&h=200&fit=crop' },
    { id: 'grocery', name: 'Grocery & Gourmet Food', icon: 'fas fa-shopping-basket', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop' },
    { id: 'pets', name: 'Pet Supplies', icon: 'fas fa-paw', image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=200&h=200&fit=crop' },
    { id: 'automotive', name: 'Automotive & Powersports', icon: 'fas fa-car', image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=200&h=200&fit=crop' },
    { id: 'tools', name: 'Tools & Home Improvement', icon: 'fas fa-tools', image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=200&h=200&fit=crop' },
    { id: 'office', name: 'Office Products / Stationery', icon: 'fas fa-briefcase', image: 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=200&h=200&fit=crop' },
    { id: 'garden', name: 'Garden, Patio & Outdoor', icon: 'fas fa-seedling', image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&h=200&fit=crop' },
    { id: 'arts', name: 'Arts, Crafts & Sewing', icon: 'fas fa-palette', image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=200&h=200&fit=crop' },
    { id: 'industrial', name: 'Industrial & Scientific', icon: 'fas fa-industry', image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=200&h=200&fit=crop' },
    { id: 'collectibles', name: 'Collectibles & Fine Art', icon: 'fas fa-gem', image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=200&fit=crop' },
    { id: 'cameras', name: 'Cameras & Photography', icon: 'fas fa-camera', image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=200&h=200&fit=crop' },
    { id: 'musical', name: 'Musical Instruments', icon: 'fas fa-music', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop' },
    { id: 'software', name: 'Software & Video Games', icon: 'fas fa-gamepad', image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&h=200&fit=crop' },
    { id: 'gifts', name: 'Gifts & Gift Cards', icon: 'fas fa-gift', image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=200&h=200&fit=crop' },
    { id: 'wellness', name: 'Health & Wellness', icon: 'fas fa-leaf', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200&h=200&fit=crop' },
    { id: 'jewelry', name: 'Fine Jewelry', icon: 'fas fa-ring', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&h=200&fit=crop' },
    { id: 'shoes', name: 'Shoes & Footwear', icon: 'fas fa-shoe-prints', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&h=200&fit=crop' },
    { id: 'handbags', name: 'Handbags & Wallets', icon: 'fas fa-wallet', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&h=200&fit=crop' },
    { id: 'sunglasses', name: 'Sunglasses & Eyewear', icon: 'fas fa-glasses', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=200&h=200&fit=crop' },
    { id: 'perfumes', name: 'Perfumes & Fragrances', icon: 'fas fa-spray-can', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=200&h=200&fit=crop' },
    { id: 'makeup', name: 'Makeup & Cosmetics', icon: 'fas fa-palette', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop' },
    { id: 'skincare', name: 'Skincare Products', icon: 'fas fa-spa', image: 'https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=200&h=200&fit=crop' },
    { id: 'haircare', name: 'Hair Care & Styling', icon: 'fas fa-cut', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200&h=200&fit=crop' },
    { id: 'fitness', name: 'Fitness & Exercise', icon: 'fas fa-dumbbell', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop' },
    { id: 'vitamins', name: 'Vitamins & Supplements', icon: 'fas fa-pills', image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=200&h=200&fit=crop' },
    { id: 'kitchen-dining', name: 'Kitchen & Dining', icon: 'fas fa-utensils', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop' },
    { id: 'bedding', name: 'Bedding & Bath', icon: 'fas fa-bed', image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=200&h=200&fit=crop' },
    { id: 'lighting', name: 'Lighting & Ceiling Fans', icon: 'fas fa-lightbulb', image: 'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=200&h=200&fit=crop' },
    { id: 'storage', name: 'Storage & Organization', icon: 'fas fa-box', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop' },
    { id: 'cleaning', name: 'Cleaning Supplies', icon: 'fas fa-broom', image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=200&h=200&fit=crop' },
    { id: 'party', name: 'Party Supplies', icon: 'fas fa-birthday-cake', image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=200&h=200&fit=crop' },
    { id: 'travel', name: 'Travel Accessories', icon: 'fas fa-plane', image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200&h=200&fit=crop' },
    { id: 'outdoor-gear', name: 'Outdoor Gear', icon: 'fas fa-mountain', image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=200&h=200&fit=crop' },
    { id: 'cycling', name: 'Cycling & Bikes', icon: 'fas fa-bicycle', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop' },
    { id: 'fishing', name: 'Fishing & Hunting', icon: 'fas fa-fish', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=200&h=200&fit=crop' },
    { id: 'gaming', name: 'Gaming Accessories', icon: 'fas fa-gamepad', image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&h=200&fit=crop' }
];

// Sample products data
const products = {
    electronics: [
        {
            id: 1,
            name: 'Samsung 65" 4K Smart TV',
            price: 899.99,
            originalPrice: 1199.99,
            discount: '25% off',
            rating: 4.5,
            reviews: 1234,
            image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=400&fit=crop',
            images: [
                'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1567690187548-f07b1d7bf5a9?w=400&h=400&fit=crop'
            ],
            features: ['4K Ultra HD Resolution', 'Smart TV with Netflix', 'HDR Support', '3 HDMI Ports'],
            description: 'Experience stunning picture quality with this Samsung 4K Smart TV. Features advanced HDR technology and built-in streaming apps.',
            specifications: {
                'Screen Size': '65 inches',
                'Resolution': '3840 x 2160',
                'HDR': 'HDR10+',
                'Smart Platform': 'Tizen OS',
                'Connectivity': 'Wi-Fi, Bluetooth, 3x HDMI, 2x USB'
            }
        },
        {
            id: 2,
            name: 'Apple MacBook Pro 16"',
            price: 2399.99,
            originalPrice: 2599.99,
            discount: '8% off',
            rating: 4.8,
            reviews: 892,
            image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop',
            images: [
                'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=400&fit=crop'
            ],
            features: ['M2 Pro Chip', '16GB RAM', '512GB SSD', 'Liquid Retina XDR Display'],
            description: 'The most powerful MacBook Pro ever. With the M2 Pro chip, this laptop delivers exceptional performance for professionals.',
            specifications: {
                'Processor': 'Apple M2 Pro',
                'Memory': '16GB Unified Memory',
                'Storage': '512GB SSD',
                'Display': '16.2-inch Liquid Retina XDR',
                'Battery': 'Up to 22 hours'
            }
        }
    ],
    mobile: [
        {
            id: 3,
            name: 'iPhone 15 Pro Max',
            price: 1199.99,
            originalPrice: 1299.99,
            discount: '8% off',
            rating: 4.7,
            reviews: 2156,
            image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=400&fit=crop',
            images: [
                'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=400&fit=crop',
                'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop'
            ],
            features: ['A17 Pro Chip', '256GB Storage', 'Pro Camera System', 'Titanium Design'],
            description: 'The ultimate iPhone experience with titanium design, advanced camera system, and the powerful A17 Pro chip.',
            specifications: {
                'Chip': 'A17 Pro',
                'Storage': '256GB',
                'Display': '6.7-inch Super Retina XDR',
                'Camera': '48MP Main, 12MP Ultra Wide, 12MP Telephoto',
                'Battery': 'Up to 29 hours video playback'
            }
        }
    ]
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadCategories();
    loadFeaturedProducts();
    updateCartCount();
    populateCategorySelect();
});

// Load categories
function loadCategories() {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = '';
    
    categories.slice(0, 12).forEach(category => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.onclick = () => showCategory(category.id);
        card.innerHTML = `
            <img src="${category.image}" alt="${category.name}">
            <h3>${category.name}</h3>
        `;
        grid.appendChild(card);
    });
}

// Load featured products
function loadFeaturedProducts() {
    const grid = document.getElementById('featuredProducts');
    grid.innerHTML = '';
    
    const allProducts = Object.values(products).flat();
    allProducts.slice(0, 8).forEach(product => {
        const card = createProductCard(product);
        grid.appendChild(card);
    });
}

// Create product card
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.onclick = () => showProduct(product);
    
    const stars = '★'.repeat(Math.floor(product.rating)) + '☆'.repeat(5 - Math.floor(product.rating));
    
    card.innerHTML = `
        <img src="${product.image}" alt="${product.name}">
        <h3>${product.name}</h3>
        <div class="rating">
            <span class="stars">${stars}</span>
            <span>(${product.reviews})</span>
        </div>
        <div class="price">
            $${product.price}
            ${product.originalPrice ? `<span class="original-price">$${product.originalPrice}</span>` : ''}
            ${product.discount ? `<span class="discount">${product.discount}</span>` : ''}
        </div>
    `;
    
    return card;
}

// Show category page
function showCategory(categoryId) {
    hideAllPages();
    document.getElementById('categoryPage').classList.add('active');
    
    const category = categories.find(c => c.id === categoryId);
    document.getElementById('categoryTitle').textContent = category.name;
    document.getElementById('currentCategory').textContent = category.name;
    
    const productsGrid = document.getElementById('categoryProducts');
    productsGrid.innerHTML = '';
    
    const categoryProducts = products[categoryId] || [];
    categoryProducts.forEach(product => {
        const card = createProductCard(product);
        productsGrid.appendChild(card);
    });
}

// Show product detail page
function showProduct(product) {
    currentProduct = product;
    hideAllPages();
    document.getElementById('productPage').classList.add('active');
    
    // Update product details
    document.getElementById('productTitle').textContent = product.name;
    document.getElementById('productName').textContent = product.name;
    document.getElementById('mainProductImage').src = product.image;
    document.getElementById('currentPrice').textContent = `$${product.price}`;
    
    if (product.originalPrice) {
        document.getElementById('originalPrice').textContent = `$${product.originalPrice}`;
        document.getElementById('originalPrice').style.display = 'inline';
    } else {
        document.getElementById('originalPrice').style.display = 'none';
    }
    
    if (product.discount) {
        document.getElementById('discount').textContent = product.discount;
        document.getElementById('discount').style.display = 'inline';
    } else {
        document.getElementById('discount').style.display = 'none';
    }
    
    // Update rating
    const stars = '★'.repeat(Math.floor(product.rating)) + '☆'.repeat(5 - Math.floor(product.rating));
    document.getElementById('productRating').innerHTML = stars;
    document.getElementById('reviewCount').textContent = `(${product.reviews} reviews)`;
    
    // Update features
    const featuresList = document.getElementById('featuresList');
    featuresList.innerHTML = '';
    product.features.forEach(feature => {
        const li = document.createElement('li');
        li.textContent = feature;
        featuresList.appendChild(li);
    });
    
    // Update thumbnails
    const thumbnails = document.getElementById('thumbnails');
    thumbnails.innerHTML = '';
    if (product.images) {
        product.images.forEach((img, index) => {
            const thumb = document.createElement('img');
            thumb.src = img;
            thumb.onclick = () => {
                document.getElementById('mainProductImage').src = img;
                thumbnails.querySelectorAll('img').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            };
            if (index === 0) thumb.classList.add('active');
            thumbnails.appendChild(thumb);
        });
    }
    
    // Update description and specifications
    document.getElementById('productDescription').innerHTML = `<p>${product.description}</p>`;
    
    const specsDiv = document.getElementById('productSpecs');
    specsDiv.innerHTML = '';
    if (product.specifications) {
        const table = document.createElement('table');
        table.style.width = '100%';
        Object.entries(product.specifications).forEach(([key, value]) => {
            const row = table.insertRow();
            row.innerHTML = `<td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">${key}</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${value}</td>`;
        });
        specsDiv.appendChild(table);
    }
}

// Navigation functions
function showHome() {
    hideAllPages();
    document.getElementById('homePage').classList.add('active');
}

function showCart() {
    hideAllPages();
    document.getElementById('cartPage').classList.add('active');
    updateCartDisplay();
}

function hideAllPages() {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
}

// Cart functions
async function addToCart() {
    if (!currentProduct) return;
    
    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
        showError('Please sign in to add items to cart');
        showLogin();
        return;
    }
    
    const quantity = parseInt(document.getElementById('quantity').value);
    const addBtn = document.querySelector('.add-to-cart');
    
    try {
        // Show loading state
        addBtn.innerHTML = '<div class="loading"></div> Adding...';
        addBtn.disabled = true;
        
        await cartAPI.addToCart(currentProduct, quantity);
        await cartAPI.loadServerCart();
        
        showSuccess('Product added to cart!');
    } catch (error) {
        showError(error.message || 'Failed to add to cart');
        
        // Fallback to local storage for offline functionality
        const existingItem = cart.find(item => item.id === currentProduct.id);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({
                ...currentProduct,
                quantity: quantity
            });
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
    } finally {
        addBtn.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
        addBtn.disabled = false;
    }
}

function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    document.getElementById('cartCount').textContent = count;
}

async function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    cartItems.innerHTML = '<div class="loading">Loading cart...</div>';
    
    try {
        // Load cart from server if authenticated
        if (authService.isAuthenticated()) {
            await cartAPI.loadServerCart();
        }
        
        cartItems.innerHTML = '';
        
        if (cart.length === 0) {
            cartItems.innerHTML = '<p>Your cart is empty</p>';
            return;
        }
        
        let subtotal = 0;
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <img src="${item.image}" alt="${item.name}">
                <div class="cart-item-info">
                    <h3>${item.name}</h3>
                    <p>$${item.price}</p>
                </div>
                <div class="cart-item-controls">
                    <button onclick="updateQuantity(${item.id}, ${item.quantity - 1})">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
                    <button onclick="removeFromCart(${item.id})">Remove</button>
                </div>
                <div>$${itemTotal.toFixed(2)}</div>
            `;
            cartItems.appendChild(cartItem);
        });
        
        document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('total').textContent = `$${subtotal.toFixed(2)}`;
    } catch (error) {
        cartItems.innerHTML = '<p>Error loading cart. Please try again.</p>';
        console.error('Cart display error:', error);
    }
}

async function updateQuantity(productId, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    try {
        if (authService.isAuthenticated()) {
            await cartAPI.updateQuantity(productId, newQuantity);
            await cartAPI.loadServerCart();
        } else {
            // Local storage fallback
            const item = cart.find(item => item.id === productId);
            if (item) {
                item.quantity = newQuantity;
                localStorage.setItem('cart', JSON.stringify(cart));
            }
        }
        
        updateCartCount();
        updateCartDisplay();
    } catch (error) {
        showError('Failed to update quantity');
        console.error('Update quantity error:', error);
    }
}

async function removeFromCart(productId) {
    try {
        if (authService.isAuthenticated()) {
            await cartAPI.removeFromCart(productId);
            await cartAPI.loadServerCart();
        } else {
            // Local storage fallback
            cart = cart.filter(item => item.id !== productId);
            localStorage.setItem('cart', JSON.stringify(cart));
        }
        
        updateCartCount();
        updateCartDisplay();
        showSuccess('Item removed from cart');
    } catch (error) {
        showError('Failed to remove item');
        console.error('Remove from cart error:', error);
    }
}

// Search function
function searchProducts() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('categorySelect').value;
    
    // Simple search implementation
    console.log('Searching for:', query, 'in category:', category);
    alert('Search functionality would be implemented here');
}

// Modal functions
function showLogin() {
    document.getElementById('loginModal').style.display = 'block';
    clearForm('loginForm');
}

function showRegister() {
    closeModal('loginModal');
    document.getElementById('registerModal').style.display = 'block';
    clearForm('registerForm');
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function clearForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
        const errorDiv = form.querySelector('.error-text');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }
}

function showFormError(formId, message) {
    const errorDiv = document.querySelector(`#${formId} .error-text`);
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function hideFormError(formId) {
    const errorDiv = document.querySelector(`#${formId} .error-text`);
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

async function login(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginBtn');
    
    // Show loading state
    loginBtn.innerHTML = '<div class="loading"></div> Signing In...';
    loginBtn.disabled = true;
    hideFormError('loginForm');
    
    try {
        const result = await authService.login({ email, password });
        
        if (result.success) {
            showSuccess(`Welcome back, ${result.user.name}!`);
            closeModal('loginModal');
            updateUIForAuth();
            
            // Sync cart after login
            await syncCartAfterLogin();
        } else {
            showFormError('loginForm', result.error);
        }
    } catch (error) {
        showFormError('loginForm', 'Network error. Please try again.');
    } finally {
        loginBtn.innerHTML = 'Sign In';
        loginBtn.disabled = false;
    }
}

async function register(event) {
    event.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const registerBtn = document.getElementById('registerBtn');
    
    // Validate passwords match
    if (password !== confirmPassword) {
        showFormError('registerForm', 'Passwords do not match');
        return;
    }
    
    // Show loading state
    registerBtn.innerHTML = '<div class="loading"></div> Creating Account...';
    registerBtn.disabled = true;
    hideFormError('registerForm');
    
    try {
        const result = await authService.register({ name, email, password });
        
        if (result.success) {
            showSuccess('Account created successfully! Please sign in.');
            closeModal('registerModal');
            showLogin();
        } else {
            showFormError('registerForm', result.error);
        }
    } catch (error) {
        showFormError('registerForm', 'Network error. Please try again.');
    } finally {
        registerBtn.innerHTML = 'Create Account';
        registerBtn.disabled = false;
    }
}

// Tab functions
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// Populate category select
function populateCategorySelect() {
    const select = document.getElementById('categorySelect');
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
    });
}

// Additional functions
function buyNow() {
    addToCart();
    showCart();
}

function addToWishlist() {
    if (!currentProduct) return;
    
    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
        showError('Please sign in to add items to wishlist');
        showLogin();
        return;
    }
    
    const existingItem = wishlist.find(item => item.id === currentProduct.id);
    if (!existingItem) {
        wishlist.push(currentProduct);
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
        showSuccess('Product added to wishlist!');
    } else {
        showError('Product already in wishlist!');
    }
}

function checkout() {
    if (!authService.isAuthenticated()) {
        showError('Please sign in to checkout');
        showLogin();
        return;
    }
    
    if (cart.length === 0) {
        showError('Your cart is empty!');
        return;
    }
    
    // Redirect to checkout page
    window.location.href = 'checkout.html';
}

function sortProducts() {
    const sortBy = document.getElementById('sortBy').value;
    console.log('Sorting by:', sortBy);
    // Sorting logic would be implemented here
}

function showDeals() {
    alert('Today\'s deals page would be implemented here');
}

function showCategories() {
    alert('All categories page would be implemented here');
}

function showBestSellers() {
    alert('Best sellers page would be implemented here');
}

function showNewArrivals() {
    alert('New arrivals page would be implemented here');
}

function showOrders() {
    if (!authService.isAuthenticated()) {
        showError('Please sign in to view orders');
        showLogin();
        return;
    }
    alert('Orders page would be implemented here');
}

function showProfile() {
    if (!authService.isAuthenticated()) {
        showError('Please sign in to view profile');
        showLogin();
        return;
    }
    
    const user = authService.getUser();
    alert(`Profile: ${user.name} (${user.email})`);
}

function showWishlist() {
    if (!authService.isAuthenticated()) {
        showError('Please sign in to view wishlist');
        showLogin();
        return;
    }
    
    if (wishlist.length === 0) {
        showError('Your wishlist is empty');
        return;
    }
    
    alert(`You have ${wishlist.length} items in your wishlist`);
}

// Close modals when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}