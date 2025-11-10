#!/bin/bash

# Script to list all accessible repositories from a GitHub organization
# This helps you identify which repos to add to GITHUB_REPOS in .env

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
fi

if [ -z "$GITHUB_TOKEN" ] || [ -z "$GITHUB_OWNER" ]; then
    echo "Error: GITHUB_TOKEN and GITHUB_OWNER must be set in .env"
    exit 1
fi

echo "Fetching repositories from GitHub organization: $GITHUB_OWNER"
echo "===================================================================="
echo ""

# Fetch all repositories with pagination
ALL_REPOS=""
PAGE=1
PER_PAGE=100

while true; do
    echo "Fetching page $PAGE..." >&2

    RESPONSE=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        "https://api.github.com/orgs/$GITHUB_OWNER/repos?per_page=$PER_PAGE&page=$PAGE&type=all")

    # Extract repo names from this page
    REPOS=$(echo "$RESPONSE" | python3 -c "
import sys, json
try:
    repos = json.load(sys.stdin)
    if isinstance(repos, list):
        for repo in repos:
            print(repo['name'])
    else:
        print('Error:', repos.get('message', 'Unknown error'), file=sys.stderr)
        sys.exit(1)
except Exception as e:
    print('Error parsing response:', str(e), file=sys.stderr)
    sys.exit(1)
")

    # Check if we got any repos
    if [ -z "$REPOS" ]; then
        break
    fi

    # Add to all repos
    if [ -z "$ALL_REPOS" ]; then
        ALL_REPOS="$REPOS"
    else
        ALL_REPOS="$ALL_REPOS
$REPOS"
    fi

    # Check if we got less than per_page results (last page)
    REPO_COUNT=$(echo "$REPOS" | wc -l | tr -d ' ')
    if [ "$REPO_COUNT" -lt "$PER_PAGE" ]; then
        break
    fi

    PAGE=$((PAGE + 1))
done

if [ -z "$ALL_REPOS" ]; then
    echo "No repositories found or error occurred."
    echo ""
    echo "Possible reasons:"
    echo "1. Token doesn't have access to the organization"
    echo "2. Organization name is incorrect"
    echo "3. Token has expired"
    exit 1
fi

# Sort repos alphabetically
ALL_REPOS=$(echo "$ALL_REPOS" | sort)

echo "Found $(echo "$ALL_REPOS" | wc -l | tr -d ' ') repositories:"
echo ""
echo "$ALL_REPOS"
echo ""
echo "===================================================================="
echo "To use ALL repositories, update your .env file:"
echo ""
echo "GITHUB_REPOS=$(echo "$ALL_REPOS" | paste -sd ',' -)"
echo ""
echo "Or copy specific repos you want to track (comma-separated)"
echo ""
echo "Saved to github-repos.txt for easier editing"

# Save to file for easier editing
echo "$ALL_REPOS" | paste -sd ',' - > github-repos.txt
echo ""
echo "Full comma-separated list saved to: github-repos.txt"
