#!/bin/bash

# ArgoCD Setup Script for EasyBuyBD

echo "🚀 Setting up ArgoCD for EasyBuyBD GitOps..."

# Install ArgoCD
echo "📦 Installing ArgoCD..."
kubectl apply -f gitops/argocd/install.yaml

# Wait for ArgoCD to be ready
echo "⏳ Waiting for ArgoCD to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd

# Get ArgoCD admin password
echo "🔑 Getting ArgoCD admin password..."
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
echo "ArgoCD Admin Password: $ARGOCD_PASSWORD"

# Install ArgoCD CLI (optional)
if ! command -v argocd &> /dev/null; then
    echo "📥 Installing ArgoCD CLI..."
    curl -sSL -o /tmp/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
    chmod +x /tmp/argocd
    sudo mv /tmp/argocd /usr/local/bin/argocd
fi

# Apply ArgoCD applications
echo "🎯 Creating ArgoCD applications..."
kubectl apply -f gitops/applications/

# Get ArgoCD server URL
ARGOCD_SERVER=$(kubectl get svc argocd-server -n argocd -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
if [ -z "$ARGOCD_SERVER" ]; then
    ARGOCD_SERVER=$(kubectl get svc argocd-server -n argocd -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
fi

echo ""
echo "✅ ArgoCD setup complete!"
echo "🌐 ArgoCD UI: http://$ARGOCD_SERVER"
echo "👤 Username: admin"
echo "🔑 Password: $ARGOCD_PASSWORD"
echo ""
echo "📱 Applications created:"
echo "  - easybuybd-dev (auto-sync enabled)"
echo "  - easybuybd-staging (auto-sync enabled)"  
echo "  - easybuybd-prod (manual sync)"
echo ""
echo "🔄 GitOps workflow is now active!"