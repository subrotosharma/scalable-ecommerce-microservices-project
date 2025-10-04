#!/bin/bash

set -e

echo "🚀 Starting AWS Infrastructure Deployment"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install AWS CLI first."
    exit 1
fi

# Check Terraform
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform not found. Please install Terraform first."
    exit 1
fi

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "📋 Using AWS Account: $ACCOUNT_ID"

# Update terraform.tfvars with actual account ID
sed -i.bak "s/REPLACE_WITH_YOUR_ACCOUNT_ID/$ACCOUNT_ID/g" terraform.tfvars
echo "✅ Updated terraform.tfvars with account ID"

# Step 1: Setup Remote State
echo "📦 Setting up remote state backend..."
cd remote-state
terraform init
terraform plan
terraform apply -auto-approve
cd ..

# Step 2: Initialize main infrastructure
echo "🏗️ Initializing Terraform..."
terraform init

# Step 3: Plan infrastructure
echo "📋 Planning infrastructure..."
terraform plan -out=tfplan

# Step 4: Apply infrastructure
echo "🚀 Deploying infrastructure..."
terraform apply tfplan

# Step 5: Configure kubectl
echo "⚙️ Configuring kubectl..."
aws eks update-kubeconfig --region us-west-2 --name marketplace-pro-eks

# Step 6: Deploy Kubernetes manifests
echo "☸️ Deploying Kubernetes resources..."
kubectl apply -f k8s-manifests/

# Step 7: Build and push container images
echo "🐳 Building and pushing container images..."
cd microservices
chmod +x build-all.sh
./build-all.sh
cd ..

echo "✅ Deployment completed successfully!"
echo "🌐 Your e-commerce platform is now running on AWS!"
echo ""
echo "📊 Access your resources:"
echo "- EKS Cluster: $(terraform output -raw eks_cluster_name)"
echo "- Load Balancer: $(terraform output -raw alb_dns_name)"
echo "- Database: $(terraform output -raw rds_endpoint)"
echo "- Domain: $(terraform output -raw domain_name)"
echo ""
echo "🔧 IMPORTANT: Update your domain registrar with these name servers:"
terraform output -raw name_servers
echo ""
echo "📋 Next steps:"
echo "1. Update subrotosharma.site DNS at your registrar with the name servers above"
echo "2. Wait 5-10 minutes for DNS propagation"
echo "3. Access your platform at:"
echo "   - https://subrotosharma.site (main site)"
echo "   - https://www.subrotosharma.site (www redirect)"
echo "   - https://api.subrotosharma.site (API endpoints)"
echo "4. SSL certificates will be automatically provisioned"