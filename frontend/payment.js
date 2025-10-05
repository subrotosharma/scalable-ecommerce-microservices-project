// Payment processing with Stripe
class PaymentService {
    constructor() {
        this.stripe = Stripe('pk_test_51234567890abcdef'); // Replace with your Stripe publishable key
        this.elements = this.stripe.elements();
        this.cardElement = null;
        this.currentOrder = null;
    }

    init() {
        // Create card element
        this.cardElement = this.elements.create('card', {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                        color: '#aab7c4',
                    },
                },
            },
        });

        // Mount card element
        this.cardElement.mount('#card-element');

        // Handle real-time validation errors from the card Element
        this.cardElement.on('change', ({error}) => {
            const displayError = document.getElementById('card-errors');
            if (error) {
                displayError.textContent = error.message;
            } else {
                displayError.textContent = '';
            }
        });

        // Load cart and calculate totals
        this.loadOrderSummary();
    }

    async loadOrderSummary() {
        try {
            // Get cart items
            const cartItems = await cartAPI.getCart();
            
            if (cartItems.length === 0) {
                window.location.href = 'index.html';
                return;
            }

            // Display cart items
            const orderItemsDiv = document.getElementById('orderItems');
            orderItemsDiv.innerHTML = '';

            let subtotal = 0;
            cartItems.forEach(item => {
                const itemTotal = parseFloat(item.price) * item.quantity;
                subtotal += itemTotal;

                const itemDiv = document.createElement('div');
                itemDiv.className = 'order-item';
                itemDiv.innerHTML = `
                    <img src="${item.product_image}" alt="${item.product_name}">
                    <div class="item-details">
                        <h4>${item.product_name}</h4>
                        <p>Qty: ${item.quantity} × $${parseFloat(item.price).toFixed(2)}</p>
                    </div>
                    <div class="item-total">$${itemTotal.toFixed(2)}</div>
                `;
                orderItemsDiv.appendChild(itemDiv);
            });

            // Calculate totals
            const shipping = subtotal > 50 ? 0 : 9.99;
            const tax = subtotal * 0.08; // 8% tax
            const total = subtotal + shipping + tax;

            // Update display
            document.getElementById('subtotalAmount').textContent = `$${subtotal.toFixed(2)}`;
            document.getElementById('shippingAmount').textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
            document.getElementById('taxAmount').textContent = `$${tax.toFixed(2)}`;
            document.getElementById('totalAmount').textContent = `$${total.toFixed(2)}`;

            this.orderTotals = { subtotal, shipping, tax, total };

        } catch (error) {
            console.error('Error loading order summary:', error);
            showError('Failed to load order summary');
        }
    }

    async processPayment(orderData) {
        try {
            const token = authService.getToken();
            if (!token) throw new Error('Authentication required');

            // Create order first
            const orderResponse = await fetch('/api/orders/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(orderData)
            });

            if (!orderResponse.ok) {
                const error = await orderResponse.json();
                throw new Error(error.error || 'Failed to create order');
            }

            const orderResult = await orderResponse.json();
            this.currentOrder = orderResult.order;

            // Create payment intent
            const paymentResponse = await fetch('/api/payment/create-intent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: this.orderTotals.total,
                    currency: 'usd',
                    orderId: this.currentOrder.id
                })
            });

            if (!paymentResponse.ok) {
                const error = await paymentResponse.json();
                throw new Error(error.error || 'Failed to create payment');
            }

            const { clientSecret } = await paymentResponse.json();

            // Confirm payment with Stripe
            const { error, paymentIntent } = await this.stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: this.cardElement,
                    billing_details: {
                        name: `${orderData.shippingAddress.firstName} ${orderData.shippingAddress.lastName}`,
                        email: orderData.shippingAddress.email,
                        address: {
                            line1: orderData.billingAddress.address,
                            city: orderData.billingAddress.city,
                            state: orderData.billingAddress.state,
                            postal_code: orderData.billingAddress.zipCode,
                            country: orderData.billingAddress.country,
                        }
                    }
                }
            });

            if (error) {
                throw new Error(error.message);
            }

            if (paymentIntent.status === 'succeeded') {
                // Confirm payment on backend
                await fetch('/api/payment/confirm', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        paymentIntentId: paymentIntent.id,
                        orderId: this.currentOrder.id
                    })
                });

                return { success: true, order: this.currentOrder };
            } else {
                throw new Error('Payment was not successful');
            }

        } catch (error) {
            console.error('Payment processing error:', error);
            throw error;
        }
    }
}

// Initialize payment service
const paymentService = new PaymentService();

// Form handling
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!authService.isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }

    // Initialize payment service
    paymentService.init();

    // Handle form submission
    document.getElementById('checkoutForm').addEventListener('submit', handleCheckout);

    // Pre-fill user information
    const user = authService.getUser();
    if (user) {
        document.getElementById('email').value = user.email;
    }
});

function toggleBilling() {
    const sameAsShipping = document.getElementById('sameAsShipping').checked;
    const billingFields = document.getElementById('billingFields');
    billingFields.style.display = sameAsShipping ? 'none' : 'block';
}

async function handleCheckout(event) {
    event.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.innerHTML = '<div class="loading"></div> Processing...';
    submitBtn.disabled = true;

    try {
        // Collect form data
        const shippingAddress = {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value,
            zipCode: document.getElementById('zipCode').value,
            country: document.getElementById('country').value
        };

        const sameAsShipping = document.getElementById('sameAsShipping').checked;
        const billingAddress = sameAsShipping ? shippingAddress : {
            address: document.getElementById('billAddress').value,
            city: document.getElementById('billCity').value,
            state: document.getElementById('billState').value,
            zipCode: document.getElementById('billZip').value,
            country: shippingAddress.country
        };

        const orderData = {
            shippingAddress,
            billingAddress,
            paymentMethod: 'card'
        };

        // Process payment
        const result = await paymentService.processPayment(orderData);

        if (result.success) {
            showSuccessModal(result.order);
        }

    } catch (error) {
        showError(error.message || 'Payment failed. Please try again.');
    } finally {
        submitBtn.innerHTML = '<i class="fas fa-lock"></i> Complete Order';
        submitBtn.disabled = false;
    }
}

function showSuccessModal(order) {
    document.getElementById('orderNumber').textContent = `#${order.id}`;
    document.getElementById('orderTotal').textContent = `$${parseFloat(order.total).toFixed(2)}`;
    document.getElementById('successModal').style.display = 'block';
}

function goToOrders() {
    window.location.href = 'orders.html';
}

function goHome() {
    window.location.href = 'index.html';
}

// Error handling
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
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