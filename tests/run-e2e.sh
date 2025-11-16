#!/bin/bash

# E2E Test Runner Script for JIRA Dev Dashboard
# This script helps run the E2E tests with proper configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
MODE="test"
CONFIG="tests/playwright.config.ts"

# Print usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --ui          Run tests in UI mode (interactive)"
    echo "  --debug       Run tests in debug mode"
    echo "  --headed      Run tests in headed mode (show browser)"
    echo "  --report      Show the HTML report"
    echo "  --help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Run all tests"
    echo "  $0 --ui               # Run tests in UI mode"
    echo "  $0 --debug            # Run tests in debug mode"
    echo "  $0 --report           # Show test report"
    exit 1
}

# Check if application is running
check_app() {
    echo -e "${YELLOW}Checking if application is running...${NC}"

    # Check frontend
    if curl -s http://localhost:3000 > /dev/null; then
        echo -e "${GREEN}✓ Frontend is running at http://localhost:3000${NC}"
    else
        echo -e "${RED}✗ Frontend is not running at http://localhost:3000${NC}"
        echo -e "${YELLOW}Please start the application with: SKIP_AUTH=true bash start.sh${NC}"
        exit 1
    fi

    # Check backend
    if curl -s http://localhost:8080/api/instances > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is running at http://localhost:8080${NC}"
    else
        echo -e "${YELLOW}⚠ Backend is not responding at http://localhost:8080${NC}"
        echo -e "${YELLOW}Some tests may fail. Make sure backend is running.${NC}"
    fi

    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --ui)
            MODE="ui"
            shift
            ;;
        --debug)
            MODE="debug"
            shift
            ;;
        --headed)
            MODE="headed"
            shift
            ;;
        --report)
            MODE="report"
            shift
            ;;
        --help|-h)
            usage
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            ;;
    esac
done

# Navigate to project root
cd "$(dirname "$0")/.."

# Show report mode
if [ "$MODE" = "report" ]; then
    echo -e "${GREEN}Opening test report...${NC}"
    npx playwright show-report tests/playwright-report
    exit 0
fi

# Check if application is running
check_app

# Run tests based on mode
echo -e "${GREEN}Running E2E tests in $MODE mode...${NC}"
echo ""

case $MODE in
    ui)
        npx playwright test --config="$CONFIG" --ui
        ;;
    debug)
        npx playwright test --config="$CONFIG" --debug
        ;;
    headed)
        npx playwright test --config="$CONFIG" --headed
        ;;
    test)
        npx playwright test --config="$CONFIG"
        ;;
esac

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo -e "${YELLOW}View report with: $0 --report${NC}"
else
    echo -e "${RED}✗ Some tests failed. Exit code: $EXIT_CODE${NC}"
    echo -e "${YELLOW}View report with: $0 --report${NC}"
fi

exit $EXIT_CODE
