#!/bin/bash

# Test if the Purchase Order API returns customer_shipping_addresses
echo "Testing Purchase Order API for customer_shipping_addresses..."

# Make a request to the API (replace with your actual endpoint and token)
curl -s -X GET "http://localhost:8000/api/finance/purchase-orders/" \
  -H "Content-Type: application/json" \
  | jq '.results[0] | {customer_name, customer_shipping_addresses}' 2>/dev/null || echo "API request failed or no data"

echo "Done."