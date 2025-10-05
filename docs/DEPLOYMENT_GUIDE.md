# Deployment Guide

## Prerequisites
- Docker & Docker Compose
- Node.js 18+
- PostgreSQL 15+
- Redis (optional, recommended for production)

## Local Development

### First Time Setup
```bash
# Clone repository
git clone https://github.com/subrotosharma/easybuybd-ecommerce.git
cd easybuybd-ecommerce

# Copy environment file
cp .env.example .env

# Edit .env with your settings
nano .env

# Run setup script
npm run dev
```

### Daily Development
```bash
# Start services
npm start

# View logs
npm run logs

# Stop services
npm stop

# Clean up
npm run cleanup
```

## Production Deployment

### Environment Variables
Set these in production:
```bash
# Database
DB_HOST=your-db-host
DB_NAME=easybuybd_prod
DB_USER=your-db-user
DB_PASSWORD=strong-password

# JWT
JWT_SECRET=very-long-random-string

# Stripe
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# Email
EMAIL_USER=noreply@easybuybd.com
EMAIL_PASS=your-app-password
```

### Database Setup
```bash
# Create database
createdb easybuybd_prod

# Run migrations
psql -h your-host -U your-user -d easybuybd_prod -f database/enhanced-schema.sql
```

### Docker Deployment
```bash
# Build images
docker-compose -f docker-compose-auth.yml build

# Start services
docker-compose -f docker-compose-auth.yml up -d

# Check health
curl http://localhost:8000/health
```

### AWS ECS Deployment
1. Build and push images to ECR
2. Update task definitions
3. Deploy services to ECS cluster
4. Configure load balancer
5. Set up monitoring

## Monitoring Setup

### Health Checks
- All services expose `/health` endpoint
- API Gateway aggregates health status
- Monitoring service tracks all services

### Logging
- Structured JSON logs
- Centralized via monitoring service
- Log rotation configured

### Metrics
- Prometheus metrics on `/metrics`
- Custom business metrics
- Performance monitoring

## Security Checklist

### Production Security
- [ ] Change all default passwords
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS/TLS
- [ ] Configure firewall rules
- [ ] Set up WAF rules
- [ ] Enable audit logging
- [ ] Implement backup strategy

### Environment Security
- [ ] Secure environment variables
- [ ] Rotate secrets regularly
- [ ] Monitor for vulnerabilities
- [ ] Keep dependencies updated
- [ ] Regular security audits

## Troubleshooting

### Common Issues
1. **Services not starting**: Check Docker daemon
2. **Database connection**: Verify credentials and network
3. **Port conflicts**: Check if ports are already in use
4. **Memory issues**: Increase Docker memory limits

### Debug Commands
```bash
# Check service logs
docker-compose logs service-name

# Check database connection
docker-compose exec postgres psql -U dbadmin -d easybuybd

# Check Redis connection
docker-compose exec redis redis-cli ping

# Test API endpoints
curl http://localhost:8000/health
```

## Backup & Recovery

### Database Backup
```bash
# Create backup
pg_dump -h localhost -U dbadmin easybuybd > backup.sql

# Restore backup
psql -h localhost -U dbadmin easybuybd < backup.sql
```

### File Backup
- Application logs
- Configuration files
- SSL certificates
- Environment variables

## Performance Tuning

### Database Optimization
- Connection pooling
- Query optimization
- Index management
- Read replicas

### Application Optimization
- Caching strategies
- Load balancing
- Auto-scaling
- CDN integration