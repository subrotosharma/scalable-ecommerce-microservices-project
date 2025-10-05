# GitOps with ArgoCD - EasyBuyBD

## Overview

This project implements GitOps using ArgoCD for continuous deployment across multiple environments.

## Architecture

```
Developer → Git Push → CI/CD Pipeline → Update Manifests → ArgoCD → Kubernetes
```

## Environments

- **Dev**: Auto-sync enabled, deploys from `develop` branch
- **Staging**: Auto-sync enabled, deploys from `main` branch  
- **Production**: Manual sync required, deploys from `main` branch

## Setup

### 1. Install ArgoCD
```bash
./scripts/setup-argocd.sh
```

### 2. Access ArgoCD UI
```bash
# Get ArgoCD URL and credentials
kubectl get svc argocd-server -n argocd
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

### 3. Configure Repository
1. Login to ArgoCD UI
2. Go to Settings → Repositories
3. Add repository: `https://github.com/subrotosharma/easybuybd-ecommerce.git`

## GitOps Workflow

### Development
1. Developer pushes code to `develop` branch
2. CI/CD runs tests and builds images
3. ArgoCD automatically syncs dev environment
4. Changes are deployed to `easybuybd-dev` namespace

### Staging
1. Code is merged to `main` branch
2. CI/CD updates staging manifests with new image tags
3. ArgoCD detects changes and auto-syncs
4. Changes are deployed to `easybuybd-staging` namespace

### Production
1. CI/CD promotes staging manifests to production
2. ArgoCD detects changes but waits for manual approval
3. Admin manually syncs production application
4. Changes are deployed to `easybuybd-prod` namespace

## Directory Structure

```
gitops/
├── argocd/                 # ArgoCD installation
├── applications/           # ArgoCD application definitions
└── manifests/             # Kubernetes manifests
    ├── dev/               # Development environment
    ├── staging/           # Staging environment
    └── prod/              # Production environment
```

## Key Features

- **Declarative Configuration**: All deployments defined in Git
- **Automated Sync**: Dev and staging auto-deploy on changes
- **Manual Production**: Production requires manual approval
- **Rollback Capability**: Easy rollback through Git history
- **Multi-Environment**: Separate namespaces for each environment
- **Security**: Secrets managed through Kubernetes secrets

## Monitoring

ArgoCD provides:
- Application health status
- Sync status and history
- Resource tree visualization
- Event logs and notifications

## Troubleshooting

### Application Out of Sync
```bash
# Manual sync
argocd app sync easybuybd-staging

# Check application status
argocd app get easybuybd-staging
```

### Check ArgoCD Logs
```bash
kubectl logs -n argocd deployment/argocd-server
```

## Best Practices

1. **Separate Repositories**: Consider separate repo for manifests in production
2. **Environment Promotion**: Use Kustomize overlays for environment differences
3. **Secret Management**: Use external secret operators for sensitive data
4. **Monitoring**: Set up alerts for sync failures
5. **RBAC**: Configure proper access controls for production