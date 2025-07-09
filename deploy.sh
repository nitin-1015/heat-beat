#!/bin/bash

# Exit on error
set -e

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    echo "Loading environment variables from .env file"
    export $(grep -v '^#' .env | xargs)
fi

# Set default values if not set
VITE_API_URL=${VITE_API_URL:-https://keval-fst-health-vital-backend.hf.space}
VITE_WS_URL=${VITE_WS_URL:-wss://keval-fst-health-vital-backend.hf.space}

echo "🚀 Starting deployment process..."

# Change to project directory
cd "$(dirname "$0")"

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install

# Build the Docker image
echo "🐳 Building Docker image..."
docker build \
    --build-arg VITE_API_URL="${VITE_API_URL}" \
    --build-arg VITE_WS_URL="${VITE_WS_URL}" \
    -t heat-beat-frontend:latest \
    .

# Tag the image for Docker Hub
echo "🏷️  Tagging image..."
docker tag heat-beat-frontend:latest kevalfst/heat-beat-frontend:latest

# Login to Docker Hub using access token
echo "🔑 Logging in to Docker Hub..."
if [ -z "$DOCKER_TOKEN" ]; then
    echo "Error: DOCKER_TOKEN environment variable is not set"
    echo "Please set your Docker access token with: export DOCKER_TOKEN=your_access_token"
    exit 1
fi

echo $DOCKER_TOKEN | docker login -u kevalfst --password-stdin docker.io
if [ $? -ne 0 ]; then
    echo "❌ Failed to log in to Docker Hub"
    exit 1
fi

# Push the image to Docker Hub
echo "📤 Pushing image to Docker Hub..."
docker push kevalfst/heat-beat-frontend:latest

# Trigger deployment hook
echo "🚀 Triggering deployment hook..."
DEPLOY_URL="https://api.render.com/deploy/srv-d1jq21ali9vc738k9m2g?key=a5rrj4Ku6jo"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$DEPLOY_URL")

if [ "$RESPONSE" -eq 200 ] || [ "$RESPONSE" -eq 201 ]; then
    echo "✅ Deployment triggered successfully!"
    echo "🔗 Deployment URL: https://health-vitals-tfp9.onrender.com"
else
    echo "❌ Failed to trigger deployment. Status code: $RESPONSE"
    exit 1
fi

echo "🚀 Deployment process completed!"
