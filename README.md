# EasyBuyBD - Enterprise E-commerce Platform

[![Production Ready](https://img.shields.io/badge/Production-Ready-green.svg)](https://github.com/subrotosharma/easybuybd-ecommerce)
[![Security Status](https://img.shields.io/badge/Security-Enterprise%20Grade-brightgreen.svg)](#security-features)
[![Microservices](https://img.shields.io/badge/Microservices-14-blue.svg)](#microservices-architecture)
[![Infrastructure](https://img.shields.io/badge/Infrastructure-AWS%20Multi--Account-orange.svg)](#infrastructure)

> **Production-ready e-commerce platform with 14 secure microservices, multi-account AWS infrastructure, and GitOps deployment.**

## **Quick Start**

### Development Environment
```bash
# Clone repository
git clone https://github.com/subrotosharma/easybuybd-ecommerce.git
cd easybuybd-ecommerce

# Start all services
npm run dev

# Access applications
# Frontend: http://localhost:3000
# API Gateway: http://localhost:8000
# Admin Dashboard: http://localhost:8091
```

### Production Deployment
```bash
# Deploy with Helm + ArgoCD
./scripts/setup-argocd.sh
./scripts/deploy-helm.sh prod

# Or deploy infrastructure
cd environments/prod && terraform apply
```

## 🏗️ **Architecture**

### **Microservices (14 Services)**
| Service | Port | Description | Status |
|---------|------|-------------|--------|
| API Gateway | 8000 | Central routing & security | Ready |
| User Service | 8080 | Authentication & user management | Ready |
| Cart Service | 8081 | Shopping cart with persistence | Ready |
| Payment Service | 8082 | Stripe payment processing | Ready |
| Order Service | 8083 | Order management & fulfillment | Ready |
| Product Service | 8084 | Product catalog | Ready |
| Inventory Service | 8085 | Stock management | Ready |
| Profile Service | 8086 | User profiles & addresses | Ready |
| Search Service | 8087 | Advanced product search | Ready |
| Review Service | 8088 | Product reviews & ratings | Ready |
| Notification Service | 8089 | Email notifications | Ready |
| Wishlist Service | 8090 | User wishlists | Ready |
| Admin Service | 8091 | Admin dashboard | Ready |
| Monitoring Service | 8092 | Health checks & metrics | Ready |

### **Frontend**
- **E-commerce UI** (3000) - Complete shopping experience with 50+ categories

### **Infrastructure**
- **AWS Multi-Account**: Separate accounts for dev/qa/stage/prod
- **EKS Clusters**: Kubernetes orchestration
- **RDS PostgreSQL**: Primary database
- **ElastiCache Redis**: Caching layer
- **Application Load Balancer**: Traffic distribution
- **CloudFront CDN**: Global content delivery
- **Route53**: DNS management
- **AWS WAF**: Web application firewall

## **Security Features**

### **Enterprise-Grade Security**
- **CSRF Protection** - All 14 microservices protected
- **XSS Prevention** - Input sanitization implemented
- **SQL Injection Prevention** - Parameterized queries
- **Log Injection Prevention** - Sanitized logging
- **Secure Cookies** - httpOnly, secure, sameSite
- **SSL/TLS** - Proper certificate validation
- **Rate Limiting** - DDoS protection
- **Input Validation** - Comprehensive validation
- **Authentication** - JWT with proper expiration
- **Authorization** - Role-based access control

### **Security Dependencies**
```json
{
  "helmet": "^7.0.0",
  "csurf": "^1.11.0", 
  "express-rate-limit": "^6.7.0",
  "winston": "^3.8.2",
  "validator": "^13.9.0"
}
```

## 📦 **Deployment Options**

### **1. GitOps with ArgoCD**
```bash
# Setup ArgoCD
./scripts/setup-argocd.sh

# Deploy applications
kubectl apply -f gitops/applications/
```

### **2. Helm Charts**
```bash
# Deploy to specific environment
./scripts/deploy-helm.sh dev     # Development
./scripts/deploy-helm.sh staging # Staging  
./scripts/deploy-helm.sh prod    # Production
```

### **3. Terraform Infrastructure**
```bash
# Setup remote state
cd remote-state && terraform apply

# Setup AWS Organizations
cd organizations && terraform apply

# Deploy environment
cd environments/prod && terraform apply
```

## 🛠️ **Development**

### **Prerequisites**
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 14+
- Redis 6+

### **Local Development**
```bash
# Install dependencies
cd microservices && npm install

# Setup environment
cp .env.example .env

# Start database
docker-compose up -d postgres redis

# Run database migrations
npm run migrate

# Start all services
npm run dev

# Run tests
npm test
```

### **Environment Variables**
```bash
# Database
DB_HOST=localhost
DB_NAME=easybuybd
DB_USER=dbadmin
DB_PASSWORD=password123

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
EMAIL_USER=noreply@easybuybd.com
EMAIL_PASS=your-email-password
```

## 📊 **Monitoring & Observability**

### **Health Checks**
- All services expose `/health` endpoints
- Kubernetes readiness/liveness probes
- Centralized monitoring dashboard

### **Logging**
- Structured JSON logging with Winston
- Centralized log aggregation
- Security event tracking

### **Metrics**
- Application performance monitoring
- Business metrics tracking
- Infrastructure monitoring

## **Production Features**

### **Scalability**
- Horizontal pod autoscaling
- Database connection pooling
- Redis caching layer
- CDN for static assets

### **Reliability**
- Multi-AZ deployment
- Database backups
- Disaster recovery
- Circuit breakers

### **Performance**
- Response time < 200ms
- 99.9% uptime SLA
- Auto-scaling based on load
- Optimized database queries

## 📁 **Project Structure**

```
├── environments/          # Environment-specific configs
│   ├── dev/              # Development environment
│   ├── qa/               # QA environment
│   ├── stage/            # Staging environment
│   └── prod/             # Production environment
├── microservices/        # 14 microservices
│   ├── api-gateway/      # Central routing
│   ├── user-service/     # Authentication
│   ├── cart-service/     # Shopping cart
│   ├── payment-service/  # Payment processing
│   └── ...               # Other services
├── frontend/             # E-commerce UI
├── modules/              # Terraform modules
│   ├── vpc/              # VPC module
│   ├── eks/              # EKS module
│   ├── rds/              # RDS module
│   └── ...               # Other modules
├── helm/                 # Helm charts
├── gitops/               # ArgoCD applications
├── database/             # Database schemas
├── scripts/              # Deployment scripts
└── docs/                 # Documentation
```

## 🔧 **API Documentation**

### **Authentication**
```bash
# Register user
POST /api/users/register
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}

# Login
POST /api/users/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

### **Shopping Cart**
```bash
# Add to cart
POST /api/cart/add
Authorization: Bearer <token>
{
  "productId": 1,
  "quantity": 2,
  "price": 29.99,
  "name": "Product Name"
}

# Get cart
GET /api/cart
Authorization: Bearer <token>
```

### **Orders**
```bash
# Create order
POST /api/orders/create
Authorization: Bearer <token>
{
  "shippingAddress": {...},
  "billingAddress": {...},
  "paymentMethod": "stripe"
}
```

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 **Support**

- **Documentation**: [docs/](./docs/)
- **API Docs**: [docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md)
- **Deployment Guide**: [docs/DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md)
- **GitOps Guide**: [docs/GITOPS_GUIDE.md](./docs/GITOPS_GUIDE.md)


## 🏆 **Status**

- **Version**: 2.1.0
- **Status**: Production Ready
- **Security**: Enterprise Grade
- **Microservices**: 14/14 Operational
- **Test Coverage**: 85%+
- **Performance**: < 200ms response time
- **Uptime**: 99.9% SLA

---

**Built with ❤️ for modern e-commerce**