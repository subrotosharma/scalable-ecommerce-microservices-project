// Cart API service
class CartAPI {
    constructor() {
        this.baseURL = '';
    }

    async addToCart(product, quantity = 1) {
        const token = authService.getToken();
        if (!token) throw new Error('Authentication required');

        try {
            const response = await fetch('/api/cart/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    productId: product.id,
                    quantity: quantity,
                    price: product.price,
                    name: product.name,
                    image: product.image
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add to cart');
            }

            return await response.json();
        } catch (error) {
            console.error('Add to cart error:', error);
            throw error;
        }
    }

    async getCart() {
        const token = authService.getToken();
        if (!token) return [];

        try {
            const response = await fetch('/api/cart', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch cart');
            }

            return await response.json();
        } catch (error) {
            console.error('Get cart error:', error);
            return [];
        }
    }

    async updateQuantity(productId, quantity) {
        const token = authService.getToken();
        if (!token) throw new Error('Authentication required');

        try {
            const response = await fetch('/api/cart/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    productId: productId,
                    quantity: quantity
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update cart');
            }

            return await response.json();
        } catch (error) {
            console.error('Update cart error:', error);
            throw error;
        }
    }

    async removeFromCart(productId) {
        const token = authService.getToken();
        if (!token) throw new Error('Authentication required');

        try {
            const response = await fetch(`/api/cart/remove/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to remove from cart');
            }

            return await response.json();
        } catch (error) {
            console.error('Remove from cart error:', error);
            throw error;
        }
    }

    async clearCart() {
        const token = authService.getToken();
        if (!token) throw new Error('Authentication required');

        try {
            const response = await fetch('/api/cart/clear', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to clear cart');
            }

            return await response.json();
        } catch (error) {
            console.error('Clear cart error:', error);
            throw error;
        }
    }

    async getCartSummary() {
        const token = authService.getToken();
        if (!token) return { item_count: 0, total_amount: 0 };

        try {
            const response = await fetch('/api/cart/summary', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                return { item_count: 0, total_amount: 0 };
            }

            return await response.json();
        } catch (error) {
            console.error('Get cart summary error:', error);
            return { item_count: 0, total_amount: 0 };
        }
    }

    // Sync local cart with server cart on login
    async syncCart() {
        if (!authService.isAuthenticated()) return;

        try {
            // Get local cart
            const localCart = JSON.parse(localStorage.getItem('cart') || '[]');
            
            // If local cart has items, sync them to server
            for (const item of localCart) {
                await this.addToCart(item, item.quantity);
            }

            // Clear local cart after sync
            localStorage.removeItem('cart');
            
            // Load server cart
            await this.loadServerCart();
        } catch (error) {
            console.error('Cart sync error:', error);
        }
    }

    // Load cart from server and update UI
    async loadServerCart() {
        if (!authService.isAuthenticated()) {
            cart = JSON.parse(localStorage.getItem('cart') || '[]');
            updateCartCount();
            return;
        }

        try {
            const serverCart = await this.getCart();
            
            // Convert server cart format to frontend format
            cart = serverCart.map(item => ({
                id: item.product_id,
                name: item.product_name,
                price: parseFloat(item.price),
                image: item.product_image,
                quantity: item.quantity
            }));

            updateCartCount();
        } catch (error) {
            console.error('Load server cart error:', error);
            // Fallback to local cart
            cart = JSON.parse(localStorage.getItem('cart') || '[]');
            updateCartCount();
        }
    }
}

// Create global cart API instance
const cartAPI = new CartAPI();