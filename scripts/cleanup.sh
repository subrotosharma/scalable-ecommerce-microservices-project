#!/bin/bash

# Cleanup script for Kubernetes environment
# Removes Helm releases and Kubernetes resources

echo "🧹 Cleaning up EasyBuyBD Kubernetes environment..."

# List current deployments
echo "📋 Current EasyBuyBD deployments:"
helm list --all-namespaces | grep easybuybd || echo "No Helm releases found"

# Ask which environment to clean
read -p "❓ Which environment to cleanup? [dev/staging/prod/all]: " ENV

case $ENV in
    "dev")
        echo "🗑️  Cleaning up development..."
        helm uninstall easybuybd-dev -n easybuybd-dev 2>/dev/null || true
        kubectl delete namespace easybuybd-dev 2>/dev/null || true
        ;;
    "staging")
        echo "🗑️  Cleaning up staging..."
        helm uninstall easybuybd-staging -n easybuybd-staging 2>/dev/null || true
        kubectl delete namespace easybuybd-staging 2>/dev/null || true
        ;;
    "prod")
        echo "🗑️  Cleaning up production..."
        helm uninstall easybuybd-prod -n easybuybd-prod 2>/dev/null || true
        kubectl delete namespace easybuybd-prod 2>/dev/null || true
        ;;
    "all")
        echo "🗑️  Cleaning up all environments..."
        helm uninstall easybuybd-dev -n easybuybd-dev 2>/dev/null || true
        helm uninstall easybuybd-staging -n easybuybd-staging 2>/dev/null || true
        helm uninstall easybuybd-prod -n easybuybd-prod 2>/dev/null || true
        kubectl delete namespace easybuybd-dev easybuybd-staging easybuybd-prod 2>/dev/null || true
        ;;
    *)
        echo "❌ Invalid environment. Use: dev, staging, prod, or all"
        exit 1
        ;;
esac

# Clean up ArgoCD applications if requested
read -p "❓ Remove ArgoCD applications? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Removing ArgoCD applications..."
    kubectl delete -f gitops/applications/ 2>/dev/null || true
fi

echo "✅ Cleanup complete!"
echo "💡 To reinstall: ./scripts/deploy-helm.sh [env]"