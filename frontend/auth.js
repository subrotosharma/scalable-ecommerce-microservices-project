// Authentication service
class AuthService {
    constructor() {
        this.baseURL = ''; // Use relative URLs with nginx proxy
        this.token = localStorage.getItem('authToken');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
    }

    async register(userData) {
        try {
            const response = await fetch(`${this.baseURL}/api/users/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Registration failed');
            }

            const data = await response.json();
            return { success: true, user: data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async login(credentials) {
        try {
            const response = await fetch(`${this.baseURL}/api/users/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Login failed');
            }

            const data = await response.json();
            
            // Store token and user data
            this.token = data.token;
            this.user = data.user;
            localStorage.setItem('authToken', this.token);
            localStorage.setItem('user', JSON.stringify(this.user));

            return { success: true, user: data.user, token: data.token };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        
        // Clear cart and wishlist on logout
        localStorage.removeItem('cart');
        localStorage.removeItem('wishlist');
        
        // Redirect to home page
        showHome();
        updateUIForLogout();
    }

    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    getUser() {
        return this.user;
    }

    getToken() {
        return this.token;
    }

    async getProfile(userId) {
        try {
            const response = await fetch(`${this.baseURL}/api/users/profile/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch profile');
            }

            return await response.json();
        } catch (error) {
            console.error('Profile fetch error:', error);
            return null;
        }
    }

    // Check if token is expired (basic check)
    isTokenExpired() {
        if (!this.token) return true;
        
        try {
            const payload = JSON.parse(atob(this.token.split('.')[1]));
            const currentTime = Date.now() / 1000;
            return payload.exp < currentTime;
        } catch (error) {
            return true;
        }
    }
}

// Create global auth service instance
const authService = new AuthService();

// Update UI based on authentication status
function updateUIForAuth() {
    const accountMenu = document.querySelector('.account-menu');
    const user = authService.getUser();
    
    if (authService.isAuthenticated() && user) {
        // Sanitize user name to prevent XSS
        const sanitizedName = user.name ? user.name.replace(/[<>"'&]/g, function(match) {
            const escapeMap = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' };
            return escapeMap[match];
        }) : 'User';
        
        accountMenu.innerHTML = `
            <i class="fas fa-user"></i>
            <span>Hello, ${sanitizedName}</span>
            <div class="dropdown">
                <a href="#" onclick="showProfile()">My Profile</a>
                <a href="#" onclick="showOrders()">My Orders</a>
                <a href="#" onclick="showWishlist()">Wishlist</a>
                <a href="#" onclick="authService.logout()">Sign Out</a>
            </div>
        `;
    } else {
        accountMenu.innerHTML = `
            <i class="fas fa-user"></i>
            <span>Account</span>
            <div class="dropdown">
                <a href="#" onclick="showLogin()">Sign In</a>
                <a href="#" onclick="showRegister()">Register</a>
            </div>
        `;
    }
}

function updateUIForLogout() {
    updateUIForAuth();
    updateCartCount();
    // Reset any user-specific data
    cart = [];
    wishlist = [];
    
    // Load local cart after logout
    cart = JSON.parse(localStorage.getItem('cart') || '[]');
    updateCartCount();
}

// Sync cart after successful login
async function syncCartAfterLogin() {
    if (typeof cartAPI !== 'undefined') {
        await cartAPI.syncCart();
    }
}

// Show loading state
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<div class="loading">Loading...</div>';
        element.disabled = true;
    }
}

function hideLoading(elementId, originalText) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = originalText;
        element.disabled = false;
    }
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    // Sanitize message to prevent XSS
    const sanitizedMessage = typeof message === 'string' ? message.replace(/[<>"'&]/g, function(match) {
        const escapeMap = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' };
        return escapeMap[match];
    }) : 'An error occurred';
    errorDiv.textContent = sanitizedMessage;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4444;
        color: white;
        padding: 15px 20px;
        border-radius: 4px;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Show success message
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    // Sanitize message to prevent XSS
    const sanitizedMessage = typeof message === 'string' ? message.replace(/[<>"'&]/g, function(match) {
        const escapeMap = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' };
        return escapeMap[match];
    }) : 'Success';
    successDiv.textContent = sanitizedMessage;
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 4px;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// Initialize auth state on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if token is expired
    if (authService.isTokenExpired()) {
        authService.logout();
    }
    
    updateUIForAuth();
});