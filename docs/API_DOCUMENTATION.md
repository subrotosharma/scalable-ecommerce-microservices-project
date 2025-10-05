# EasyBuyBD API Documentation

## Base URL
- Development: `http://localhost:8000`
- Production: `https://api.easybuybd.com`

## Authentication
All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Rate Limits
- Public endpoints: 300 requests per 15 minutes
- Authenticated endpoints: 500 requests per 15 minutes  
- Admin endpoints: 100 requests per 15 minutes

## Error Responses
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token

### Products
- `GET /api/products` - List products with pagination
- `GET /api/products/:id` - Get single product
- `GET /api/categories` - List all categories

### Search
- `GET /api/search` - Search products with filters
- `GET /api/search/suggestions` - Get search suggestions
- `GET /api/search/filters` - Get available filters

### Cart (Authenticated)
- `GET /api/cart` - Get user cart
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update` - Update cart item
- `DELETE /api/cart/remove/:productId` - Remove from cart

### Orders (Authenticated)
- `GET /api/orders` - Get user orders
- `POST /api/orders/create` - Create new order
- `GET /api/orders/:id` - Get order details
- `GET /api/orders/:id/tracking` - Get order tracking

### Reviews (Authenticated)
- `GET /api/reviews/:productId` - Get product reviews
- `POST /api/reviews` - Add product review
- `GET /api/reviews/:productId/summary` - Get rating summary

### Wishlist (Authenticated)
- `GET /api/wishlist` - Get user wishlist
- `POST /api/wishlist` - Add to wishlist
- `DELETE /api/wishlist/:productId` - Remove from wishlist

### Admin (Admin Only)
- `GET /api/admin/dashboard` - Get dashboard stats
- `GET /api/admin/products` - Manage products
- `GET /api/admin/orders` - Manage orders
- `GET /api/admin/users` - Manage users

### Monitoring
- `GET /health` - Service health check
- `GET /api/monitoring/health` - System health
- `GET /metrics` - Prometheus metrics

## Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error