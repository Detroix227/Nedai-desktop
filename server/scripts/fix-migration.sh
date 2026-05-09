#!/bin/bash
set -e

echo "Checking migration status..."

# Try to resolve the failed migration if it exists
bunx prisma migrate resolve --rolled-back 20260508104247_add_user_learning_profiles 2>/dev/null || echo "Migration not in failed state or already resolved"

# Now deploy all migrations
echo "Deploying migrations..."
bunx prisma migrate deploy

echo "Migrations complete!"
