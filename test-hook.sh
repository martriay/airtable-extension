#!/bin/bash
set -e

echo "Running tests..."
npx vitest run --reporter=basic --no-coverage 2>/dev/null
echo "Tests completed successfully!"
exit 0