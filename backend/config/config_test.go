package config

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

// TestLoadConfig_Success tests successful configuration loading
func TestLoadConfig_Success(t *testing.T) {
	// Clear any existing env vars that might be loaded from .env
	os.Unsetenv("JIRA_BASE_URL_2")
	os.Unsetenv("JIRA_EMAIL_2")
	os.Unsetenv("JIRA_API_TOKEN_2")

	// Set environment variables
	os.Setenv("JIRA_BASE_URL", "https://test.atlassian.net")
	os.Setenv("JIRA_EMAIL", "test@example.com")
	os.Setenv("JIRA_API_TOKEN", "test-token")
	defer func() {
		os.Unsetenv("JIRA_BASE_URL")
		os.Unsetenv("JIRA_EMAIL")
		os.Unsetenv("JIRA_API_TOKEN")
	}()

	cfg, err := LoadConfig()

	assert.NoError(t, err)
	assert.NotNil(t, cfg)
	assert.GreaterOrEqual(t, len(cfg.Instances), 1)
	assert.NotNil(t, cfg.Instances["primary"])
	assert.Equal(t, "https://test.atlassian.net", cfg.Instances["primary"].BaseURL)
	assert.Equal(t, "test@example.com", cfg.Instances["primary"].Email)
	assert.Equal(t, "test-token", cfg.Instances["primary"].Token)
}

// TestLoadConfig_MissingURL tests error when URL is missing
func TestLoadConfig_MissingURL(t *testing.T) {
	// Clear environment variables
	os.Unsetenv("JIRA_BASE_URL")
	os.Unsetenv("JIRA_BASE_URL_2")
	os.Setenv("JIRA_EMAIL", "test@example.com")
	os.Setenv("JIRA_API_TOKEN", "test-token")
	defer func() {
		os.Unsetenv("JIRA_EMAIL")
		os.Unsetenv("JIRA_API_TOKEN")
	}()

	cfg, err := LoadConfig()

	assert.Error(t, err)
	assert.Nil(t, cfg)
	assert.Contains(t, err.Error(), "at least one JIRA instance")
}

// TestLoadConfig_MissingEmail tests error when email is missing
func TestLoadConfig_MissingEmail(t *testing.T) {
	os.Setenv("JIRA_BASE_URL", "https://test.atlassian.net")
	os.Unsetenv("JIRA_EMAIL")
	os.Setenv("JIRA_API_TOKEN", "test-token")
	defer func() {
		os.Unsetenv("JIRA_BASE_URL")
		os.Unsetenv("JIRA_API_TOKEN")
	}()

	cfg, err := LoadConfig()

	assert.Error(t, err)
	assert.Nil(t, cfg)
	assert.Contains(t, err.Error(), "at least one JIRA instance")
}

// TestLoadConfig_MissingAPIToken tests error when API token is missing
func TestLoadConfig_MissingAPIToken(t *testing.T) {
	os.Setenv("JIRA_BASE_URL", "https://test.atlassian.net")
	os.Setenv("JIRA_EMAIL", "test@example.com")
	os.Unsetenv("JIRA_API_TOKEN")
	defer func() {
		os.Unsetenv("JIRA_BASE_URL")
		os.Unsetenv("JIRA_EMAIL")
	}()

	cfg, err := LoadConfig()

	assert.Error(t, err)
	assert.Nil(t, cfg)
	assert.Contains(t, err.Error(), "at least one JIRA instance")
}

// TestJiraInstance_Struct tests JiraInstance struct fields
func TestJiraInstance_Struct(t *testing.T) {
	instance := JiraInstance{
		Name:    "Test Instance",
		BaseURL: "https://test.atlassian.net",
		Email:   "test@example.com",
		Token:   "test-token",
	}

	assert.Equal(t, "Test Instance", instance.Name)
	assert.Equal(t, "https://test.atlassian.net", instance.BaseURL)
	assert.Equal(t, "test@example.com", instance.Email)
	assert.Equal(t, "test-token", instance.Token)
}

// TestConfig_Struct tests Config struct fields
func TestConfig_Struct(t *testing.T) {
	instances := make(map[string]*JiraInstance)
	instances["instance1"] = &JiraInstance{Name: "Instance 1"}
	instances["instance2"] = &JiraInstance{Name: "Instance 2"}

	cfg := Config{
		Instances: instances,
	}

	assert.Len(t, cfg.Instances, 2)
	assert.Equal(t, "Instance 1", cfg.Instances["instance1"].Name)
	assert.Equal(t, "Instance 2", cfg.Instances["instance2"].Name)
}

// TestLoadConfig_WithName tests loading config with custom name
func TestLoadConfig_WithName(t *testing.T) {
	os.Setenv("JIRA_BASE_URL", "https://test.atlassian.net")
	os.Setenv("JIRA_EMAIL", "test@example.com")
	os.Setenv("JIRA_API_TOKEN", "test-token")
	os.Setenv("JIRA_INSTANCE_NAME", "Custom JIRA Instance")
	defer func() {
		os.Unsetenv("JIRA_BASE_URL")
		os.Unsetenv("JIRA_EMAIL")
		os.Unsetenv("JIRA_API_TOKEN")
		os.Unsetenv("JIRA_INSTANCE_NAME")
	}()

	cfg, err := LoadConfig()

	assert.NoError(t, err)
	assert.NotNil(t, cfg)
	assert.Len(t, cfg.Instances, 1)
	assert.Equal(t, "Custom JIRA Instance", cfg.Instances["primary"].Name)
}

// TestGetInstance tests getting instance by ID
func TestGetInstance(t *testing.T) {
	instance := &JiraInstance{Name: "Test"}
	cfg := &Config{
		Instances: map[string]*JiraInstance{
			"test": instance,
		},
	}

	result, err := cfg.GetInstance("test")
	assert.NoError(t, err)
	assert.Equal(t, instance, result)

	result, err = cfg.GetInstance("nonexistent")
	assert.Error(t, err)
	assert.Nil(t, result)
}

// TestGetDefaultInstance tests getting default instance
func TestGetDefaultInstance(t *testing.T) {
	primaryInstance := &JiraInstance{Name: "Primary"}
	cfg := &Config{
		Instances: map[string]*JiraInstance{
			"primary": primaryInstance,
		},
	}

	result := cfg.GetDefaultInstance()
	assert.Equal(t, primaryInstance, result)

	// Test with no primary
	otherInstance := &JiraInstance{Name: "Other"}
	cfg2 := &Config{
		Instances: map[string]*JiraInstance{
			"other": otherInstance,
		},
	}

	result = cfg2.GetDefaultInstance()
	assert.NotNil(t, result)

	// Test with no instances
	cfg3 := &Config{
		Instances: make(map[string]*JiraInstance),
	}

	result = cfg3.GetDefaultInstance()
	assert.Nil(t, result)
}

// TestLoadConfig_SecondaryInstance tests loading secondary instance
func TestLoadConfig_SecondaryInstance(t *testing.T) {
	os.Setenv("JIRA_BASE_URL", "https://primary.atlassian.net")
	os.Setenv("JIRA_EMAIL", "primary@example.com")
	os.Setenv("JIRA_API_TOKEN", "primary-token")
	os.Setenv("JIRA_BASE_URL_2", "https://secondary.atlassian.net")
	os.Setenv("JIRA_EMAIL_2", "secondary@example.com")
	os.Setenv("JIRA_API_TOKEN_2", "secondary-token")
	os.Setenv("JIRA_INSTANCE_NAME_2", "Secondary Custom Name")
	defer func() {
		os.Unsetenv("JIRA_BASE_URL")
		os.Unsetenv("JIRA_EMAIL")
		os.Unsetenv("JIRA_API_TOKEN")
		os.Unsetenv("JIRA_BASE_URL_2")
		os.Unsetenv("JIRA_EMAIL_2")
		os.Unsetenv("JIRA_API_TOKEN_2")
		os.Unsetenv("JIRA_INSTANCE_NAME_2")
	}()

	cfg, err := LoadConfig()

	assert.NoError(t, err)
	assert.NotNil(t, cfg)
	assert.Len(t, cfg.Instances, 2)
	assert.NotNil(t, cfg.Instances["primary"])
	assert.NotNil(t, cfg.Instances["secondary"])
	assert.Equal(t, "https://secondary.atlassian.net", cfg.Instances["secondary"].BaseURL)
	assert.Equal(t, "secondary@example.com", cfg.Instances["secondary"].Email)
	assert.Equal(t, "secondary-token", cfg.Instances["secondary"].Token)
	assert.Equal(t, "Secondary Custom Name", cfg.Instances["secondary"].Name)
}

// TestLoadConfig_OnlySecondaryInstance tests loading only secondary instance
func TestLoadConfig_OnlySecondaryInstance(t *testing.T) {
	os.Unsetenv("JIRA_BASE_URL")
	os.Unsetenv("JIRA_EMAIL")
	os.Unsetenv("JIRA_API_TOKEN")
	os.Setenv("JIRA_BASE_URL_2", "https://secondary.atlassian.net")
	os.Setenv("JIRA_EMAIL_2", "secondary@example.com")
	os.Setenv("JIRA_API_TOKEN_2", "secondary-token")
	defer func() {
		os.Unsetenv("JIRA_BASE_URL_2")
		os.Unsetenv("JIRA_EMAIL_2")
		os.Unsetenv("JIRA_API_TOKEN_2")
	}()

	cfg, err := LoadConfig()

	assert.NoError(t, err)
	assert.NotNil(t, cfg)
	assert.Len(t, cfg.Instances, 1)
	assert.Nil(t, cfg.Instances["primary"])
	assert.NotNil(t, cfg.Instances["secondary"])
}

// TestLoadConfig_PartialSecondaryInstance tests partial secondary instance config (should be ignored)
func TestLoadConfig_PartialSecondaryInstance(t *testing.T) {
	os.Setenv("JIRA_BASE_URL", "https://primary.atlassian.net")
	os.Setenv("JIRA_EMAIL", "primary@example.com")
	os.Setenv("JIRA_API_TOKEN", "primary-token")
	os.Setenv("JIRA_BASE_URL_2", "https://secondary.atlassian.net")
	os.Setenv("JIRA_EMAIL_2", "secondary@example.com")
	// Missing JIRA_API_TOKEN_2
	os.Unsetenv("JIRA_API_TOKEN_2")
	defer func() {
		os.Unsetenv("JIRA_BASE_URL")
		os.Unsetenv("JIRA_EMAIL")
		os.Unsetenv("JIRA_API_TOKEN")
		os.Unsetenv("JIRA_BASE_URL_2")
		os.Unsetenv("JIRA_EMAIL_2")
	}()

	cfg, err := LoadConfig()

	assert.NoError(t, err)
	assert.NotNil(t, cfg)
	assert.Len(t, cfg.Instances, 1) // Only primary should be loaded
	assert.NotNil(t, cfg.Instances["primary"])
	assert.Nil(t, cfg.Instances["secondary"])
}

// TestLoadConfig_CustomServerPort tests loading custom server port
func TestLoadConfig_CustomServerPort(t *testing.T) {
	os.Setenv("JIRA_BASE_URL", "https://test.atlassian.net")
	os.Setenv("JIRA_EMAIL", "test@example.com")
	os.Setenv("JIRA_API_TOKEN", "test-token")
	os.Setenv("SERVER_PORT", "3000")
	defer func() {
		os.Unsetenv("JIRA_BASE_URL")
		os.Unsetenv("JIRA_EMAIL")
		os.Unsetenv("JIRA_API_TOKEN")
		os.Unsetenv("SERVER_PORT")
	}()

	cfg, err := LoadConfig()

	assert.NoError(t, err)
	assert.NotNil(t, cfg)
	assert.Equal(t, "3000", cfg.ServerPort)
}

// TestLoadConfig_DefaultServerPort tests default server port
func TestLoadConfig_DefaultServerPort(t *testing.T) {
	os.Setenv("JIRA_BASE_URL", "https://test.atlassian.net")
	os.Setenv("JIRA_EMAIL", "test@example.com")
	os.Setenv("JIRA_API_TOKEN", "test-token")
	os.Unsetenv("SERVER_PORT")
	defer func() {
		os.Unsetenv("JIRA_BASE_URL")
		os.Unsetenv("JIRA_EMAIL")
		os.Unsetenv("JIRA_API_TOKEN")
	}()

	cfg, err := LoadConfig()

	assert.NoError(t, err)
	assert.NotNil(t, cfg)
	assert.Equal(t, "8080", cfg.ServerPort) // Default port
}

// TestGetInstance_ErrorMessage tests error message format
func TestGetInstance_ErrorMessage(t *testing.T) {
	cfg := &Config{
		Instances: make(map[string]*JiraInstance),
	}

	_, err := cfg.GetInstance("missing-instance")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "instance 'missing-instance' not found")
}

// TestLoadEnvFile_WithValidFile tests loading environment variables from .env file
func TestLoadEnvFile_WithValidFile(t *testing.T) {
	// Create a temporary .env file
	envContent := `# Test comment
JIRA_BASE_URL=https://test-from-file.atlassian.net
JIRA_EMAIL="test-from-file@example.com"
JIRA_API_TOKEN='token-from-file'
SERVER_PORT=9090

# Another comment
EMPTY_LINE_BELOW=value

QUOTED_VALUE="value with spaces"
`
	// Write to .env
	err := os.WriteFile(".env", []byte(envContent), 0644)
	assert.NoError(t, err)
	defer os.Remove(".env")

	// Clear any existing env vars
	os.Unsetenv("JIRA_BASE_URL")
	os.Unsetenv("JIRA_EMAIL")
	os.Unsetenv("JIRA_API_TOKEN")
	os.Unsetenv("SERVER_PORT")
	os.Unsetenv("EMPTY_LINE_BELOW")
	os.Unsetenv("QUOTED_VALUE")

	// Load config which will call loadEnvFile
	cfg, err := LoadConfig()

	assert.NoError(t, err)
	assert.NotNil(t, cfg)
	assert.Equal(t, "https://test-from-file.atlassian.net", os.Getenv("JIRA_BASE_URL"))
	assert.Equal(t, "test-from-file@example.com", os.Getenv("JIRA_EMAIL"))
	assert.Equal(t, "token-from-file", os.Getenv("JIRA_API_TOKEN"))
	assert.Equal(t, "9090", os.Getenv("SERVER_PORT"))
	assert.Equal(t, "value", os.Getenv("EMPTY_LINE_BELOW"))
	assert.Equal(t, "value with spaces", os.Getenv("QUOTED_VALUE"))

	// Clean up
	os.Unsetenv("JIRA_BASE_URL")
	os.Unsetenv("JIRA_EMAIL")
	os.Unsetenv("JIRA_API_TOKEN")
	os.Unsetenv("SERVER_PORT")
	os.Unsetenv("EMPTY_LINE_BELOW")
	os.Unsetenv("QUOTED_VALUE")
}

// TestLoadEnvFile_NoFile tests that missing .env file is handled gracefully
func TestLoadEnvFile_NoFile(t *testing.T) {
	// Make sure there's no .env file
	os.Remove(".env")

	// Set env vars directly
	os.Setenv("JIRA_BASE_URL", "https://test.atlassian.net")
	os.Setenv("JIRA_EMAIL", "test@example.com")
	os.Setenv("JIRA_API_TOKEN", "test-token")
	defer func() {
		os.Unsetenv("JIRA_BASE_URL")
		os.Unsetenv("JIRA_EMAIL")
		os.Unsetenv("JIRA_API_TOKEN")
	}()

	// Should not error even without .env file
	cfg, err := LoadConfig()

	assert.NoError(t, err)
	assert.NotNil(t, cfg)
}

// TestLoadEnvFile_InvalidFormat tests handling malformed .env lines
func TestLoadEnvFile_InvalidFormat(t *testing.T) {
	// Create a .env file with invalid lines that should be skipped
	envContent := `JIRA_BASE_URL=https://test.atlassian.net
INVALID_LINE_NO_EQUALS
JIRA_EMAIL=test@example.com
=NO_KEY_VALUE
JIRA_API_TOKEN=test-token
`
	err := os.WriteFile(".env", []byte(envContent), 0644)
	assert.NoError(t, err)
	defer os.Remove(".env")

	// Clear any existing env vars
	os.Unsetenv("JIRA_BASE_URL")
	os.Unsetenv("JIRA_EMAIL")
	os.Unsetenv("JIRA_API_TOKEN")

	cfg, err := LoadConfig()

	// Should still load successfully, just skipping invalid lines
	assert.NoError(t, err)
	assert.NotNil(t, cfg)
	assert.Equal(t, "https://test.atlassian.net", os.Getenv("JIRA_BASE_URL"))
	assert.Equal(t, "test@example.com", os.Getenv("JIRA_EMAIL"))
	assert.Equal(t, "test-token", os.Getenv("JIRA_API_TOKEN"))

	// Clean up
	os.Unsetenv("JIRA_BASE_URL")
	os.Unsetenv("JIRA_EMAIL")
	os.Unsetenv("JIRA_API_TOKEN")
}

// TestLoadConfig_EnvFileSetsVars tests that .env file sets environment variables
func TestLoadConfig_EnvFileSetsVars(t *testing.T) {
	// Create a .env file
	envContent := `JIRA_BASE_URL=https://file.atlassian.net
JIRA_EMAIL=file@example.com
JIRA_API_TOKEN=file-token
`
	err := os.WriteFile(".env", []byte(envContent), 0644)
	assert.NoError(t, err)
	defer os.Remove(".env")

	// Clear any existing env vars
	os.Unsetenv("JIRA_BASE_URL")
	os.Unsetenv("JIRA_EMAIL")
	os.Unsetenv("JIRA_API_TOKEN")
	defer func() {
		os.Unsetenv("JIRA_BASE_URL")
		os.Unsetenv("JIRA_EMAIL")
		os.Unsetenv("JIRA_API_TOKEN")
	}()

	cfg, err := LoadConfig()

	assert.NoError(t, err)
	assert.NotNil(t, cfg)
	// .env file values should be loaded
	assert.Equal(t, "https://file.atlassian.net", cfg.Instances["primary"].BaseURL)
	assert.Equal(t, "file@example.com", cfg.Instances["primary"].Email)
	assert.Equal(t, "file-token", cfg.Instances["primary"].Token)
}
