#!/bin/bash

# Test script to verify round-robin load balancing is working
# This script makes multiple requests to the health endpoint and shows which backend responds

echo "Testing Caddy Load Balancer - Round Robin Distribution"
echo "======================================================"
echo ""

# Make 12 requests to see the round-robin distribution
for i in {1..12}; do
    echo "Request $i:"
    
    # Make request and capture response with headers
    response=$(curl -s -w "HTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
                   -H "Accept: application/json" \
                   http://167.71.199.165/api/health)
    
    echo "$response"
    echo "---"
    sleep 1
done

echo ""
echo "If load balancing is working correctly, you should see responses"
echo "distributed across the 3 backend instances (app1, app2, app3)."
echo ""
echo "You can also check Caddy logs with:"
echo "docker logs cv-management-caddy"
