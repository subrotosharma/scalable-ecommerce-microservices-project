#!/bin/bash

ACCOUNT_ID=${1:-"123456789012"}
REGION=${2:-"us-west-2"}

services=("user-service" "product-service" "order-service" "payment-service" "cart-service" "inventory-service" "notification-service" "review-service" "search-service" "api-gateway" "web-frontend" "seller-service" "recommendation-service" "fraud-detection-service" "analytics-service" "logistics-service" "catalog-service")

echo "Building and pushing microservices to ECR..."

# Login to ECR
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

for service in "${services[@]}"; do
    echo "Building $service..."
    
    cd $service
    
    # Build Docker image
    docker build -t $service .
    
    # Tag for ECR
    docker tag $service:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$service:latest
    
    # Push to ECR
    docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$service:latest
    
    cd ..
    
    echo "$service built and pushed successfully"
done

echo "All microservices built and pushed!"