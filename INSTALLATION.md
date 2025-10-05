# EasyBuyBD Installation Guide

Welcome! This guide will help you get EasyBuyBD up and running on your machine. Don't worry if you're new to this - I'll walk you through everything step by step.

## What You'll Need

Before we start, make sure you have these installed on your computer:

- **Node.js** (version 18 or newer) - [Download here](https://nodejs.org/)
- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
- **Git** - [Download here](https://git-scm.com/downloads)

**Quick check:** Open your terminal and run these commands to verify:
```bash
node --version    # Should show v18.x.x or higher
docker --version  # Should show Docker version
git --version     # Should show Git version
```

## Choose Your Installation Method

### Option 1: Quick Start (Recommended for Beginners)
Perfect if you just want to see the platform in action.

### Option 2: Full Development Setup
Choose this if you want to modify code or contribute to the project.

### Option 3: Production Deployment
For deploying to AWS (requires AWS account and Kubernetes knowledge).

---

## Option 1: Quick Start

### Step 1: Get the Code
```bash
# Download the project
git clone https://github.com/subrotosharma/easybuybd-ecommerce.git

# Go into the project folder
cd easybuybd-ecommerce
```

### Step 2: Start the Database
```bash
# This will download and start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait about 30 seconds for databases to start
```

### Step 3: Setup the Application
```bash
# Go to the microservices folder
cd microservices

# Install all the required packages (this might take a few minutes)
npm install

# Copy the example environment file
cp .env.example .env
```

### Step 4: Setup the Database
```bash
# Create the database tables and add sample data
npm run migrate
npm run seed
```

### Step 5: Start Everything
```bash
# Start all 14 microservices
npm run dev
```

### Step 6: Open Your Browser
- **Main Website**: http://localhost:3000
- **Admin Dashboard**: http://localhost:8091
- **API Gateway**: http://localhost:8000

**That's it! You should see the EasyBuyBD homepage.**

---

## Option 2: Full Development Setup

### Step 1: System Requirements
Make sure you have:
- **Node.js 18+**
- **Docker Desktop** (running)
- **PostgreSQL 14+** (optional - can use Docker)
- **Redis 6+** (optional - can use Docker)

### Step 2: Clone and Setup
```bash
# Get the code
git clone https://github.com/subrotosharma/easybuybd-ecommerce.git
cd easybuybd-ecommerce

# Install project dependencies
npm install
```

### Step 3: Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit the file with your settings
nano .env  # or use any text editor
```

**Important environment variables:**
```bash
# Database settings
DB_HOST=localhost
DB_NAME=easybuybd
DB_USER=dbadmin
DB_PASSWORD=password123

# Redis settings
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT secret (change this!)
JWT_SECRET=your-super-secret-key-here

# Stripe (for payments - get from stripe.com)
STRIPE_SECRET_KEY=sk_test_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email (for notifications)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Step 4: Database Setup
```bash
# Start databases with Docker
docker-compose up -d postgres redis

# Or if you have local PostgreSQL/Redis, make sure they're running
# sudo service postgresql start
# sudo service redis-server start
```

### Step 5: Install Dependencies
```bash
# Go to microservices folder
cd microservices

# Install all packages
npm install

# Go back to root
cd ..
```

### Step 6: Database Migration
```bash
# Create database tables
cd microservices
npm run migrate

# Add sample data (optional)
npm run seed
```

### Step 7: Start Development Servers
```bash
# Start all microservices in development mode
npm run dev

# Or start individual services:
# npm run start:user-service
# npm run start:cart-service
# etc.
```

### Step 8: Start Frontend
```bash
# In a new terminal window
cd frontend

# Install frontend dependencies
npm install

# Start the frontend server
npm start
```

### Step 9: Verify Everything Works
Check these URLs:
- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:8000/health
- **User Service**: http://localhost:8080/health
- **Cart Service**: http://localhost:8081/health

**All should return "healthy" status.**

---

## Option 3: Production Deployment (AWS)

### Prerequisites
- AWS Account with appropriate permissions
- AWS CLI configured
- kubectl installed
- Helm installed
- Terraform installed

### Step 1: Setup AWS Infrastructure
```bash
# Clone the repository
git clone https://github.com/subrotosharma/easybuybd-ecommerce.git
cd easybuybd-ecommerce

# Setup Terraform backend
cd remote-state
terraform init
terraform apply

# Setup AWS Organizations (optional)
cd ../organizations
terraform init
terraform apply
```

### Step 2: Deploy Infrastructure
```bash
# Choose your environment (dev/staging/prod)
cd environments/prod

# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Deploy infrastructure
terraform apply
```

### Step 3: Setup Kubernetes
```bash
# Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name easybuybd-prod-cluster

# Verify connection
kubectl get nodes
```

### Step 4: Deploy with Helm
```bash
# Go back to root directory
cd ../../

# Deploy using Helm
./scripts/deploy-helm.sh prod
```

### Step 5: Setup GitOps (Optional)
```bash
# Install ArgoCD
./scripts/setup-argocd.sh

# Deploy applications
kubectl apply -f gitops/applications/
```

---

## Troubleshooting

### Common Issues and Solutions

**Problem**: "Port already in use"
```bash
# Find what's using the port
lsof -i :3000

# Kill the process
kill -9 <process-id>
```

**Problem**: "Database connection failed"
```bash
# Check if Docker containers are running
docker ps

# Restart databases
docker-compose restart postgres redis
```

**Problem**: "npm install fails"
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and try again
rm -rf node_modules
npm install
```

**Problem**: "Permission denied"
```bash
# On Linux/Mac, you might need to use sudo
sudo npm install -g <package-name>

# Or fix npm permissions
npm config set prefix ~/.npm-global
```

### Getting Help

If you're stuck:

1. **Check the logs**: Look at the terminal output for error messages
2. **Restart everything**: Sometimes a fresh start helps
3. **Check our docs**: Look in the `docs/` folder for more detailed guides
4. **Ask for help**: Create an issue on GitHub with your error message

---

## What's Next?

### For Developers
- Read the [API Documentation](docs/API_DOCUMENTATION.md)
- Check out the [Development Guide](docs/DEVELOPMENT_GUIDE.md)
- Look at the code structure in each microservice folder

### For DevOps Engineers
- Review the [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- Learn about [GitOps with ArgoCD](docs/GITOPS_GUIDE.md)
- Check the Terraform modules in `modules/` folder

### For Security Teams
- Review the security features in README.md
- Check the security implementations in each service
- Review the security dependencies and configurations

---

## Need Help?

- **Documentation**: Check the `docs/` folder
- **Issues**: Create a GitHub issue
- **Email**: support@easybuybd.com
- **Security**: security@easybuybd.com

---

**Congratulations! You've successfully installed EasyBuyBD. Happy coding!**