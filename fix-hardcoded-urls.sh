#!/bin/bash

# Script to replace hardcoded URLs with centralized API calls

echo "Fixing hardcoded URLs in finance components..."

# Replace all hardcoded 127.0.0.1:8000 URLs with relative /api URLs
find frontend/src/pages/services/finance -name "*.tsx" -exec sed -i 's|http://127\.0\.0\.1:8000/api|/api|g' {} \;

# Add apiClient import to files that use axios directly
find frontend/src/pages/services/finance -name "*.tsx" -exec grep -l "axios\." {} \; | while read file; do
    if ! grep -q "import.*apiClient.*from.*lib/api" "$file"; then
        sed -i '/import.*axios/a import { apiClient } from '\''../../../../lib/api'\''' "$file"
    fi
done

echo "Fixed hardcoded URLs. Please rebuild the frontend."