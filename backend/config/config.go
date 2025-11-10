package config

import (
	"fmt"
	"os"
	"strings"
)

// JiraInstance represents a single JIRA instance configuration
type JiraInstance struct {
	Name     string `json:"name"`
	BaseURL  string `json:"baseUrl"`
	Email    string `json:"email"`
	Token    string `json:"token"`
}

// GitHubConfig represents GitHub repository configuration
type GitHubConfig struct {
	Token string   `json:"token"`
	Owner string   `json:"owner"`
	Repos []string `json:"repos"` // Support multiple repositories
}

// AhaConfig represents Aha product management configuration
type AhaConfig struct {
	APIKey string `json:"apiKey"`
	Domain string `json:"domain"`
}

// Config holds the application configuration
type Config struct {
	Instances  map[string]*JiraInstance
	GitHub     *GitHubConfig
	Aha        *AhaConfig
	ServerPort string
}

// LoadConfig loads configuration from environment variables or .env file
func LoadConfig() (*Config, error) {
	// Try to load .env file
	loadEnvFile()

	config := &Config{
		Instances:  make(map[string]*JiraInstance),
		ServerPort: getEnv("SERVER_PORT", "8080"),
	}

	// Load GitHub configuration
	githubToken := getEnv("GITHUB_TOKEN", "")
	githubOwner := getEnv("GITHUB_OWNER", "")
	githubRepos := getEnv("GITHUB_REPOS", "")

	if githubToken != "" && githubOwner != "" && githubRepos != "" {
		// Split comma-separated list of repositories
		repos := strings.Split(githubRepos, ",")
		for i := range repos {
			repos[i] = strings.TrimSpace(repos[i])
		}

		config.GitHub = &GitHubConfig{
			Token: githubToken,
			Owner: githubOwner,
			Repos: repos,
		}
	}

	// Load Aha configuration
	ahaAPIKey := getEnv("AHA_API_KEY", "")
	ahaDomain := getEnv("AHA_DOMAIN", "")

	if ahaAPIKey != "" && ahaDomain != "" {
		config.Aha = &AhaConfig{
			APIKey: ahaAPIKey,
			Domain: ahaDomain,
		}
	}

	// Load primary instance (backward compatible with old config)
	primaryURL := getEnv("JIRA_BASE_URL", "")
	primaryEmail := getEnv("JIRA_EMAIL", "")
	primaryToken := getEnv("JIRA_API_TOKEN", "")

	if primaryURL != "" && primaryEmail != "" && primaryToken != "" {
		config.Instances["primary"] = &JiraInstance{
			Name:    getEnv("JIRA_INSTANCE_NAME", "Primary Instance"),
			BaseURL: primaryURL,
			Email:   primaryEmail,
			Token:   primaryToken,
		}
	}

	// Load secondary instance (new)
	secondaryURL := getEnv("JIRA_BASE_URL_2", "")
	secondaryEmail := getEnv("JIRA_EMAIL_2", "")
	secondaryToken := getEnv("JIRA_API_TOKEN_2", "")

	if secondaryURL != "" && secondaryEmail != "" && secondaryToken != "" {
		config.Instances["secondary"] = &JiraInstance{
			Name:    getEnv("JIRA_INSTANCE_NAME_2", "Secondary Instance"),
			BaseURL: secondaryURL,
			Email:   secondaryEmail,
			Token:   secondaryToken,
		}
	}

	// Validate that at least one instance is configured
	if len(config.Instances) == 0 {
		return nil, fmt.Errorf("at least one JIRA instance must be configured")
	}

	return config, nil
}

// GetInstance returns a specific JIRA instance by ID
func (c *Config) GetInstance(instanceID string) (*JiraInstance, error) {
	instance, exists := c.Instances[instanceID]
	if !exists {
		return nil, fmt.Errorf("instance '%s' not found", instanceID)
	}
	return instance, nil
}

// GetDefaultInstance returns the first available instance
func (c *Config) GetDefaultInstance() *JiraInstance {
	// Try primary first
	if instance, exists := c.Instances["primary"]; exists {
		return instance
	}
	// Return any available instance
	for _, instance := range c.Instances {
		return instance
	}
	return nil
}

// getEnv gets an environment variable with a default value
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// loadEnvFile loads environment variables from .env file
func loadEnvFile() {
	data, err := os.ReadFile(".env")
	if err != nil {
		return // .env file is optional
	}

	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])
			// Remove quotes if present
			value = strings.Trim(value, "\"'")
			os.Setenv(key, value)
		}
	}
}
