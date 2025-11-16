# Aha Package API Documentation

## Overview

The `aha` package provides a client for interacting with the Aha! product management API to verify JIRA ticket linkages and fetch feature information.

**Package:** `jira-dashboard/aha`
**Location:** [backend/aha/client.go](../../backend/aha/client.go)

---

## Types

### Client

Aha API client for making authenticated requests.

```go
type Client struct {
    BaseURL string
    APIKey  string
    client  *http.Client
}
```

### Feature

Represents an Aha feature/product requirement.

```go
type Feature struct {
    ID                string
    ReferenceNum      string
    Name              string
    Description       string
    CreatedAt         time.Time
    UpdatedAt         time.Time
    WorkflowStatus    WorkflowStatus
    URL               string
    IntegrationFields []IntegrationField
}
```

### WorkflowStatus

Represents the workflow status of a feature.

```go
type WorkflowStatus struct {
    ID       string
    Name     string
    Complete bool
}
```

### IntegrationField

Represents an Aha integration field (e.g., JIRA integration).

```go
type IntegrationField struct {
    ID            string
    Name          string
    Value         string
    IntegrationID string
    ServiceName   string
    CreatedAt     string
}
```

### FeatureVerification

Represents the verification status of a JIRA ticket in Aha.

```go
type FeatureVerification struct {
    JiraKey      string
    ExistsInAha  bool
    AhaReference string
    AhaURL       string
    AhaStatus    string
    Error        string
}
```

---

## Constructor Functions

### NewClient

Creates a new Aha API client.

```go
func NewClient(apiKey, domain string) *Client
```

**Parameters:**
- `apiKey` - Aha API key for authentication
- `domain` - Aha subdomain (e.g., "mycompany" for mycompany.aha.io)

**Returns:**
- `*Client` - Configured Aha client

**Example:**
```go
client := aha.NewClient(
    "your-aha-api-key",
    "mycompany"
)
// Client will use: https://mycompany.aha.io/api/v1
```

---

## Client Methods

### TestConnection

Tests the connection to Aha API.

```go
func (c *Client) TestConnection(ctx context.Context) error
```

**Parameters:**
- `ctx` - Context for request cancellation

**Returns:**
- `error` - Nil if connection successful, error otherwise

**Error Cases:**
- Authentication failed (401) - Invalid API key
- Other non-200 status codes - Connection or API issues

**Example:**
```go
ctx := context.Background()
if err := client.TestConnection(ctx); err != nil {
    log.Printf("Connection failed: %v", err)
}
```

### GetFeatureByReference

Fetches an Aha feature by its reference number.

```go
func (c *Client) GetFeatureByReference(ctx context.Context, referenceNum string) (*Feature, error)
```

**Parameters:**
- `ctx` - Context for request cancellation
- `referenceNum` - Feature reference number (e.g., "APP-1234")

**Returns:**
- `*Feature` - Feature information
- `error` - Error if feature not found or retrieval fails

**Example:**
```go
feature, err := client.GetFeatureByReference(ctx, "APP-1234")
if err != nil {
    log.Printf("Feature not found: %v", err)
} else {
    log.Printf("Feature: %s - %s", feature.ReferenceNum, feature.Name)
    log.Printf("Status: %s (Complete: %v)", feature.WorkflowStatus.Name, feature.WorkflowStatus.Complete)
}
```

### VerifyFeatures

Verifies if JIRA tickets exist in Aha by searching through integration fields.

```go
func (c *Client) VerifyFeatures(ctx context.Context, jiraKeys []string) ([]FeatureVerification, error)
```

**Parameters:**
- `ctx` - Context for request cancellation
- `jiraKeys` - Array of JIRA ticket keys to verify (e.g., ["PROJ-123", "PROJ-456"])

**Returns:**
- `[]FeatureVerification` - Verification results for each JIRA key
- `error` - Returns partial results even if some verifications fail

**Verification Process:**
1. Fetches all Aha features with integration fields (paginated)
2. Builds a map of JIRA keys to Aha features
3. Checks each requested JIRA key against the map
4. Returns verification status for each key

**Rate Limiting:**
- Maximum 20 requests per second
- Automatic rate limiting with 50ms delay between requests

**Example:**
```go
jiraKeys := []string{"PROJ-123", "PROJ-456", "PROJ-789"}
verifications, err := client.VerifyFeatures(ctx, jiraKeys)

for _, v := range verifications {
    if v.ExistsInAha {
        fmt.Printf("✓ %s exists in Aha: %s (%s)\n",
            v.JiraKey, v.AhaReference, v.AhaStatus)
        fmt.Printf("  URL: %s\n", v.AhaURL)
    } else {
        fmt.Printf("✗ %s not found in Aha\n", v.JiraKey)
    }

    if v.Error != "" {
        fmt.Printf("  Error: %s\n", v.Error)
    }
}
```

---

## Usage Example

```go
package main

import (
    "context"
    "jira-dashboard/aha"
    "log"
)

func main() {
    ctx := context.Background()

    // Create Aha client
    client := aha.NewClient(
        "your-api-key",
        "mycompany"
    )

    // Test connection
    if err := client.TestConnection(ctx); err != nil {
        log.Fatalf("Aha connection failed: %v", err)
    }
    log.Println("Successfully connected to Aha")

    // Verify JIRA tickets in Aha
    jiraKeys := []string{
        "PROJ-123",
        "PROJ-124",
        "PROJ-125",
    }

    verifications, err := client.VerifyFeatures(ctx, jiraKeys)
    if err != nil {
        log.Printf("Warning: Verification completed with errors: %v", err)
    }

    // Process verification results
    inAha := 0
    notInAha := 0

    for _, v := range verifications {
        if v.ExistsInAha {
            inAha++
            log.Printf("✓ %s linked to Aha feature %s", v.JiraKey, v.AhaReference)
            log.Printf("  Status: %s", v.AhaStatus)
            log.Printf("  URL: %s", v.AhaURL)
        } else {
            notInAha++
            log.Printf("✗ %s not found in Aha", v.JiraKey)
        }

        if v.Error != "" {
            log.Printf("  Error: %s", v.Error)
        }
    }

    log.Printf("\nSummary: %d in Aha, %d not in Aha", inAha, notInAha)

    // Get specific feature by reference
    feature, err := client.GetFeatureByReference(ctx, "APP-1234")
    if err == nil {
        log.Printf("\nFeature Details:")
        log.Printf("  Reference: %s", feature.ReferenceNum)
        log.Printf("  Name: %s", feature.Name)
        log.Printf("  Status: %s", feature.WorkflowStatus.Name)
        log.Printf("  Complete: %v", feature.WorkflowStatus.Complete)
        log.Printf("  URL: %s", feature.URL)

        // Check JIRA integrations
        for _, field := range feature.IntegrationFields {
            if field.ServiceName == "jira" && field.Name == "key" {
                log.Printf("  Linked JIRA: %s", field.Value)
            }
        }
    }
}
```

---

## API Endpoints Used

The client interacts with the following Aha API v1 endpoints:

- `GET /features` - List all features (with pagination)
- `GET /features/{reference}` - Get a specific feature by reference number

---

## Notes

- The client uses Bearer token authentication with the Aha API key
- All requests have a 30-second timeout
- The `VerifyFeatures` method implements automatic pagination to fetch all features
- Rate limiting is implemented at 20 requests per second (50ms delay)
- JIRA integration fields are identified by `service_name == "jira"` and `name == "key"`
- The client supports Aha API v1
- Base URL format: `https://{domain}.aha.io/api/v1`
- All methods accept a `context.Context` for request cancellation and timeout control
