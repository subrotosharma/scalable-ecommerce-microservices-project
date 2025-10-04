#!/bin/bash

set -e

echo "🚀 Setting up local development environment..."

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }

echo "✅ Prerequisites check passed"

# Install dependencies for all services
echo "📦 Installing dependencies..."
for service in microservices/*/; do
    if [ -f "$service/package.json" ]; then
        echo "Installing dependencies for $(basename "$service")"
        cd "$service"
        npm install
        cd - > /dev/null
    fi
done

# Start infrastructure services
echo "🐳 Starting infrastructure services..."
docker-compose up -d postgres redis

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Initialize database
echo "🗄️ Initializing database..."
docker-compose exec -T postgres psql -U admin -d ecommerce -f /docker-entrypoint-initdb.d/init.sql

echo "✅ Local environment setup complete!"
echo "🌐 You can now start the services with: docker-compose up"
echo "📱 Frontend will be available at: http://localhost:3000"
echo "🔗 API Gateway will be available at: http://localhost:8000"