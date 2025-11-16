# Config Package API Documentation

## Overview

The `config` package handles application configuration loading from environment variables and provides access to JIRA, GitHub, and Aha configurations.

**Package:** `jira-dashboard/config`
**Location:** [backend/config/config.go](../../backend/config/config.go)

---

## Types

### Config

Main configuration structure that holds all application settings.

```go
type Config struct {
    Instances  map[string]*JiraInstance
    GitHub     *GitHubConfig
    Aha        *AhaConfig
    ServerPort string
}
```

**Fields:**
- `Instances` - Map of JIRA instance IDs to instance configurations
- `GitHub` - GitHub repository configuration (optional)
- `Aha` - Aha product management configuration (optional)
- `ServerPort` - HTTP server port (default: "8080")

### JiraInstance

Configuration for a single JIRA instance.

```go
type JiraInstance struct {
    Name    string
    BaseURL string
    Email   string
    Token   string
}
```

**Fields:**
- `Name` - Display name of the JIRA instance
- `BaseURL` - Base URL of the JIRA instance API
- `Email` - User email for authentication
- `Token` - API token for authentication

### GitHubConfig

GitHub repository configuration.

```go
type GitHubConfig struct {
    Token string
    Owner string
    Repos []string
}
```

**Fields:**
- `Token` - GitHub personal access token
- `Owner` - Repository owner/organization name
- `Repos` - List of repository names to track

### AhaConfig

Aha product management configuration.

```go
type AhaConfig struct {
    APIKey string
    Domain string
}
```

**Fields:**
- `APIKey` - Aha API key for authentication
- `Domain` - Aha subdomain (e.g., "mycompany" for mycompany.aha.io)

---

## Functions

### LoadConfig

Loads configuration from environment variables or .env file.

```go
func LoadConfig() (*Config, error)
```

**Returns:**
- `*Config` - Loaded configuration object
- `error` - Error if configuration is invalid or missing required fields

**Environment Variables:**
- `SERVER_PORT` - Server port (default: "8080")
- `JIRA_BASE_URL` - Primary JIRA instance URL
- `JIRA_EMAIL` - Primary JIRA email
- `JIRA_API_TOKEN` - Primary JIRA API token
- `JIRA_INSTANCE_NAME` - Primary JIRA instance name (default: "Primary Instance")
- `JIRA_BASE_URL_2` - Secondary JIRA instance URL (optional)
- `JIRA_EMAIL_2` - Secondary JIRA email (optional)
- `JIRA_API_TOKEN_2` - Secondary JIRA API token (optional)
- `JIRA_INSTANCE_NAME_2` - Secondary JIRA instance name (default: "Secondary Instance")
- `GITHUB_TOKEN` - GitHub personal access token (optional)
- `GITHUB_OWNER` - GitHub repository owner (optional)
- `GITHUB_REPOS` - Comma-separated list of GitHub repositories (optional)
- `AHA_API_KEY` - Aha API key (optional)
- `AHA_DOMAIN` - Aha subdomain (optional)

**Example:**
```go
cfg, err := config.LoadConfig()
if err != nil {
    log.Fatalf("Failed to load config: %v", err)
}
```

---

## Methods

### GetInstance

Returns a specific JIRA instance by ID.

```go
func (c *Config) GetInstance(instanceID string) (*JiraInstance, error)
```

**Parameters:**
- `instanceID` - ID of the instance to retrieve ("primary" or "secondary")

**Returns:**
- `*JiraInstance` - The requested JIRA instance configuration
- `error` - Error if instance not found

**Example:**
```go
instance, err := cfg.GetInstance("primary")
if err != nil {
    log.Printf("Instance not found: %v", err)
}
```

### GetDefaultInstance

Returns the first available JIRA instance (prioritizes "primary").

```go
func (c *Config) GetDefaultInstance() *JiraInstance
```

**Returns:**
- `*JiraInstance` - The default JIRA instance configuration

**Example:**
```go
instance := cfg.GetDefaultInstance()
if instance != nil {
    log.Printf("Using instance: %s", instance.Name)
}
```

---

## Usage Example

```go
package main

import (
    "jira-dashboard/config"
    "log"
)

func main() {
    // Load configuration
    cfg, err := config.LoadConfig()
    if err != nil {
        log.Fatalf("Configuration error: %v", err)
    }

    // Access default JIRA instance
    instance := cfg.GetDefaultInstance()
    log.Printf("Connected to: %s at %s", instance.Name, instance.BaseURL)

    // Check GitHub configuration
    if cfg.GitHub != nil {
        log.Printf("GitHub tracking enabled for %d repos", len(cfg.GitHub.Repos))
    }

    // Check Aha configuration
    if cfg.Aha != nil {
        log.Printf("Aha integration enabled for domain: %s", cfg.Aha.Domain)
    }
}
```

---

## Notes

- At least one JIRA instance must be configured
- The configuration supports multiple JIRA instances simultaneously
- GitHub and Aha configurations are optional
- Environment variables can be set directly or via a `.env` file in the project root
