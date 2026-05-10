#!/bin/bash

echo "Testing PO Creation Endpoint..."
echo ""

# Test if the endpoint is accessible
curl -s -o /dev/null -w "Status: %{http_code}\n" \
  "https://sap.athenas.co.in/api/finance/purchase-orders/?session_key=mKvfUauoHEduuV1gUPUDD3TPxUGrVHSF5PRPV96O"

echo ""
echo "If status is 200, the endpoint is working."
echo "If status is 500, there's a server error."
echo ""
echo "To see the actual error, check:"
echo "1. Browser Console (F12 → Console)"
echo "2. Network tab (F12 → Network → look for red requests)"
echo "3. Response body of the failed request"
