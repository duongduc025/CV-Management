#!/bin/bash

# Read from environment variables or use defaults
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}
DB_NAME=${DB_NAME:-cvmanagement}

echo "Seeding database with mock data..."

# Execute SQL file with psql
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f backend/scripts/insert_mock_data.sql

if [ $? -eq 0 ]; then
  echo "Successfully inserted mock data into database!"
else
  echo "Failed to insert mock data."
  exit 1
fi 