#!/bin/bash

# Helm Deployment Script for EasyBuyBD

set -e

ENVIRONMENT=${1:-dev}
NAMESPACE="easybuybd-${ENVIRONMENT}"
RELEASE_NAME="easybuybd-${ENVIRONMENT}"

echo "🚀 Deploying EasyBuyBD to ${ENVIRONMENT} environment..."

# Check if Helm is installed
if ! command -v helm &> /dev/null; then
    echo "❌ Helm is not installed. Please install Helm first."
    exit 1
fi

# Add Bitnami repository for PostgreSQL and Redis
echo "📦 Adding Bitnami Helm repository..."
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Create namespace if it doesn't exist
echo "🏗️  Creating namespace ${NAMESPACE}..."
kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

# Update dependencies
echo "📥 Updating Helm dependencies..."
cd helm/easybuybd
helm dependency update
cd ../..

# Deploy based on environment
case ${ENVIRONMENT} in
    "dev")
        echo "🔧 Deploying to development..."
        helm upgrade --install ${RELEASE_NAME} helm/easybuybd \
            --namespace ${NAMESPACE} \
            --values helm/easybuybd/values-dev.yaml \
            --set image.tag=latest \
            --wait --timeout=10m
        ;;
    "staging")
        echo "🔧 Deploying to staging..."
        helm upgrade --install ${RELEASE_NAME} helm/easybuybd \
            --namespace ${NAMESPACE} \
            --values helm/easybuybd/values.yaml \
            --set environment=staging \
            --set namespace=${NAMESPACE} \
            --wait --timeout=10m
        ;;
    "prod")
        echo "🔧 Deploying to production..."
        helm upgrade --install ${RELEASE_NAME} helm/easybuybd \
            --namespace ${NAMESPACE} \
            --values helm/easybuybd/values-prod.yaml \
            --wait --timeout=15m
        ;;
    *)
        echo "❌ Invalid environment: ${ENVIRONMENT}"
        echo "Usage: $0 [dev|staging|prod]"
        exit 1
        ;;
esac

# Get deployment status
echo "📊 Checking deployment status..."
kubectl get pods -n ${NAMESPACE}
kubectl get services -n ${NAMESPACE}

# Get ingress info
if kubectl get ingress -n ${NAMESPACE} &> /dev/null; then
    echo "🌐 Ingress information:"
    kubectl get ingress -n ${NAMESPACE}
fi

echo ""
echo "✅ EasyBuyBD deployed successfully to ${ENVIRONMENT}!"
echo "🔍 Monitor with: kubectl get pods -n ${NAMESPACE} -w"
echo "📝 Logs: kubectl logs -f deployment/api-gateway -n ${NAMESPACE}"
echo "🗑️  Cleanup: helm uninstall ${RELEASE_NAME} -n ${NAMESPACE}"