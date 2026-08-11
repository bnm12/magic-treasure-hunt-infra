#!/bin/bash
set -e

echo "Tryllestavsprojekt Bootstrapping Script"
echo "======================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js (v20+ recommended) and try again."
    exit 1
fi

echo "Installing website workspace dependencies..."
cd "$(dirname "$0")/../website"
npm install

echo "======================================"
echo "Setup completed successfully! You can now run the dev server with 'npm run dev' or build with 'npm run build'."
