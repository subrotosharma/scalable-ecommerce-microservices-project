# AWS Multi-Account Terraform Infrastructure for E-commerce

This project implements a multi-account AWS setup (dev/qa/stage/prod) using Terraform modules for deploying e-commerce microservices similar to Amazon, eBay, or Daraz.

## Architecture

- **Organizations**: AWS Organizations with SCPs for guardrails
- **Accounts**: Separate AWS accounts for dev, qa, stage, and prod
- **Infrastructure**: VPC, EKS, RDS, ECR, ElastiCache modules
- **State Management**: Remote state in S3 with DynamoDB locking
- **Security**: tflint, tfsec/Checkov scanning

## E-commerce Microservices

### Core Services
- **user-service**: User authentication and profile management
- **product-service**: Product catalog and inventory
- **order-service**: Order processing and management
- **payment-service**: Payment processing integration
- **cart-service**: Shopping cart functionality
- **inventory-service**: Stock management
- **notification-service**: Email/SMS notifications
- **review-service**: Product reviews and ratings
- **search-service**: Product search and filtering
- **api-gateway**: API routing and rate limiting
- **web-frontend**: React/Angular frontend application

### Infrastructure Components
- **EKS**: Kubernetes clusters for microservices
- **RDS**: PostgreSQL for transactional data
- **ElastiCache**: Redis for session storage and caching
- **ECR**: Container registry for microservice images
- **VPC**: Network isolation with public/private subnets
- **NAT Gateways**: Internet access for private subnets

## Structure

```
├── modules/           # Reusable Terraform modules
│   ├── vpc/          # VPC with subnets and NAT gateways
│   ├── eks/          # EKS cluster and node groups
│   ├── rds/          # PostgreSQL database
│   ├── ecr/          # Container registry
│   └── elasticache/  # Redis cluster
├── environments/      # Environment-specific configurations
│   ├── dev/          # Development environment
│   ├── qa/           # QA environment
│   ├── stage/        # Staging environment
│   └── prod/         # Production environment
├── organizations/     # AWS Organizations setup
├── pipeline/         # CI/CD pipeline configuration
├── remote-state/     # Remote state setup
└── k8s-manifests/    # Kubernetes deployment manifests
```

## Usage

1. **Setup remote state**: `cd remote-state && terraform apply`
2. **Setup organizations**: `cd organizations && terraform apply`
3. **Deploy environment**: `cd environments/dev && terraform apply`
4. **Deploy microservices**: `kubectl apply -f k8s-manifests/`
5. **Pipeline runs automatically on PR/merge**

## Microservices Deployment

Each microservice runs in EKS with:
- Horizontal Pod Autoscaling
- Service mesh (Istio) for communication
- Centralized logging and monitoring
- Database per service pattern
- Redis for caching and sessions

## Environment Differences

- **Dev**: Single AZ, smaller instances, public EKS access
- **QA**: Multi-AZ, medium instances, automated testing
- **Stage**: Production-like, immutable tags, performance testing
- **Prod**: High availability, large instances, manual approval required