#!/bin/bash

# JIRA Dashboard - Run All Tests
# This script runs both backend and frontend tests

set -e

echo "========================================="
echo "🧪 JIRA Dashboard - Running All Tests"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track test results
BACKEND_PASSED=0
FRONTEND_PASSED=0

# Backend Tests
echo "📦 Running Backend Tests (Go)..."
echo "========================================="
cd backend
if go test ./... -v; then
    BACKEND_PASSED=1
    echo -e "${GREEN}✓ Backend tests passed${NC}"
else
    echo -e "${RED}✗ Backend tests failed${NC}"
fi
cd ..
echo ""

# Frontend Tests
echo "⚛️  Running Frontend Tests (Vitest)..."
echo "========================================="
cd frontend
if npm test -- --run; then
    FRONTEND_PASSED=1
    echo -e "${GREEN}✓ Frontend tests passed${NC}"
else
    echo -e "${RED}✗ Frontend tests failed${NC}"
fi
cd ..
echo ""

# Summary
echo "========================================="
echo "📊 Test Summary"
echo "========================================="
if [ $BACKEND_PASSED -eq 1 ]; then
    echo -e "${GREEN}✓ Backend:  PASSED${NC}"
else
    echo -e "${RED}✗ Backend:  FAILED${NC}"
fi

if [ $FRONTEND_PASSED -eq 1 ]; then
    echo -e "${GREEN}✓ Frontend: PASSED${NC}"
else
    echo -e "${RED}✗ Frontend: FAILED${NC}"
fi

echo ""
if [ $BACKEND_PASSED -eq 1 ] && [ $FRONTEND_PASSED -eq 1 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
