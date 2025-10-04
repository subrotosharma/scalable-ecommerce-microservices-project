#!/bin/bash

set -e

ENVIRONMENT=${1:-dev}
ACCOUNT_ID=${2:-"123456789012"}
REGION=${3:-"us-west-2"}

echo "🚀 Deploying to $ENVIRONMENT environment..."

# Step 1: Deploy infrastructure
echo "📦 Deploying infrastructure..."
cd environments/$ENVIRONMENT
terraform init
terraform plan
terraform apply -auto-approve
cd ../..

# Step 2: Build and push Docker images
echo "🐳 Building and pushing Docker images..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

cd microservices
./build-all.sh $ACCOUNT_ID $REGION
cd ..

# Step 3: Update kubeconfig
echo "⚙️ Updating kubeconfig..."
aws eks update-kubeconfig --region $REGION --name multi-account-infra-$ENVIRONMENT-cluster

# Step 4: Deploy to Kubernetes
echo "☸️ Deploying to Kubernetes..."
kubectl apply -f k8s-manifests/namespace.yaml
kubectl apply -f k8s-manifests/complete-microservices.yaml

echo "✅ Deployment completed successfully!"