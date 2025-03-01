#!/bin/bash
set -e

# Wait for database to be ready
echo "Waiting for database to be ready..."
./scripts/wait-for-it.sh db:5432 -t 60

# Run database migrations
echo "Running database migrations..."
npm run db:push

# Start the application
echo "Starting the application..."
NODE_ENV=development exec npm run dev