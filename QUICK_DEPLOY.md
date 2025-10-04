# 🚀 Quick AWS Deployment Guide

## Prerequisites
1. **AWS CLI** configured with admin permissions
2. **Terraform** installed (v1.0+)
3. **kubectl** installed
4. **Docker** installed

## One-Command Deployment

```bash
./deploy.sh
```

## Manual Step-by-Step

### 1. Configure AWS Credentials
```bash
aws configure
# Enter your Access Key, Secret Key, Region (us-west-2)
```

### 2. Update Account ID
```bash
# Get your account ID
aws sts get-caller-identity

# Update terraform.tfvars
# Replace REPLACE_WITH_YOUR_ACCOUNT_ID with your actual account ID
```

### 3. Deploy Remote State
```bash
cd remote-state
terraform init
terraform apply
cd ..
```

### 4. Deploy Infrastructure
```bash
terraform init
terraform plan
terraform apply
```

### 5. Configure Kubernetes
```bash
aws eks update-kubeconfig --region us-west-2 --name marketplace-pro-eks
kubectl apply -f k8s-manifests/
```

### 6. Build & Deploy Microservices
```bash
cd microservices
./build-all.sh
```

## Estimated Costs
- **Development**: ~$200-300/month
- **Production**: ~$800-1200/month

## Resources Created
- ✅ VPC with public/private subnets
- ✅ EKS cluster with auto-scaling
- ✅ RDS PostgreSQL database
- ✅ ElastiCache Redis cluster
- ✅ ECR repositories (17 services)
- ✅ Application Load Balancer
- ✅ Secrets Manager
- ✅ CloudWatch monitoring

## Access Your Platform
After deployment:
- **API**: `http://<alb-dns-name>/api`
- **Frontend**: `http://<alb-dns-name>`
- **Kubernetes**: `kubectl get pods -n ecommerce`

## Cleanup
```bash
terraform destroy
```