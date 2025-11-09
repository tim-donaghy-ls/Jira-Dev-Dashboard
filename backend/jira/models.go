package jira

import "time"

// Issue represents a JIRA issue/ticket
type Issue struct {
	Key                      string          `json:"key"`
	Summary                  string          `json:"summary"`
	Status                   string          `json:"status"`
	Priority                 string          `json:"priority"`
	IssueType                string          `json:"issueType"`
	Created                  time.Time       `json:"created"`
	Updated                  time.Time       `json:"updated"`
	Resolved                 *time.Time      `json:"resolved,omitempty"`
	Assignee                 string          `json:"assignee"`
	Reporter                 string          `json:"reporter"`
	StoryPoints              float64         `json:"storyPoints,omitempty"`
	Sprint                   string          `json:"sprint"`
	Labels                   []string        `json:"labels"`
	Description              string          `json:"description"`
	StatusHistory            []StatusHistory `json:"statusHistory,omitempty"`
	InProgressToQADays       float64         `json:"inProgressToQADays,omitempty"`
	DevelopmentTimeDays      float64         `json:"developmentTimeDays,omitempty"`
}

// StatusHistory represents a status change in an issue's history
type StatusHistory struct {
	Status    string    `json:"status"`
	Timestamp time.Time `json:"timestamp"`
	FromStatus string   `json:"fromStatus,omitempty"`
}

// Sprint represents a JIRA sprint
type Sprint struct {
	ID           int        `json:"id"`
	Name         string     `json:"name"`
	State        string     `json:"state"`
	StartDate    *time.Time `json:"startDate,omitempty"`
	EndDate      *time.Time `json:"endDate,omitempty"`
	CompleteDate *time.Time `json:"completeDate,omitempty"`
	BoardID      int        `json:"boardId,omitempty"`
}

// JiraSprintSearchResponse represents the response from JIRA sprint search API
type JiraSprintSearchResponse struct {
	MaxResults int      `json:"maxResults"`
	StartAt    int      `json:"startAt"`
	Total      int      `json:"total"`
	IsLast     bool     `json:"isLast"`
	Values     []Sprint `json:"values"`
}

// JiraSearchResponse represents the response from JIRA search API
type JiraSearchResponse struct {
	Expand     string      `json:"expand"`
	StartAt    int         `json:"startAt"`
	MaxResults int         `json:"maxResults"`
	Total      int         `json:"total"`
	Issues     []JiraIssue `json:"issues"`
}

// JiraIssue represents the raw JIRA API issue format
type JiraIssue struct {
	Key    string     `json:"key"`
	Fields JiraFields `json:"fields"`
}

// JiraFields represents the fields in a JIRA issue
type JiraFields struct {
	Summary        string                 `json:"summary"`
	Description    interface{}            `json:"description"` // Can be string or object (ADF format)
	Status         JiraStatus             `json:"status"`
	Priority       JiraPriority           `json:"priority"`
	IssueType      JiraIssueType          `json:"issuetype"`
	Created        string                 `json:"created"`
	Updated        string                 `json:"updated"`
	Resolutiondate *string                `json:"resolutiondate"`
	Assignee       *JiraUser              `json:"assignee"`
	Reporter       JiraUser               `json:"reporter"`
	Labels         []string               `json:"labels"`
	Sprint         *JiraSprint            `json:"sprint"`

	// Story Points - try multiple common custom field names
	StoryPoints1        interface{} `json:"customfield_10016"` // Common story points field
	StoryPoints2        interface{} `json:"customfield_10026"` // Alternative story points field
	StoryPoints3        interface{} `json:"customfield_10002"` // Another alternative
	StoryPoints4        interface{} `json:"customfield_10004"` // Another alternative
	StoryPoints5        interface{} `json:"customfield_10024"` // Another alternative
	StoryPoints6        interface{} `json:"customfield_10031"` // Another alternative
	StoryPointsAlt      interface{} `json:"Story Points"`       // Sometimes it's a named field
	StoryPointEstimate  interface{} `json:"Story Point Estimate"` // Exact field name from JIRA
}

type JiraStatus struct {
	Name string `json:"name"`
}

type JiraPriority struct {
	Name string `json:"name"`
}

type JiraIssueType struct {
	Name string `json:"name"`
}

type JiraUser struct {
	DisplayName  string `json:"displayName"`
	EmailAddress string `json:"emailAddress"`
}

type JiraSprint struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	State string `json:"state"`
}

// Project represents a JIRA project
type Project struct {
	ID   string `json:"id"`
	Key  string `json:"key"`
	Name string `json:"name"`
}

// JiraProjectSearchResponse represents the response from JIRA project search API
type JiraProjectSearchResponse struct {
	Self       string    `json:"self"`
	MaxResults int       `json:"maxResults"`
	StartAt    int       `json:"startAt"`
	Total      int       `json:"total"`
	IsLast     bool      `json:"isLast"`
	Values     []Project `json:"values"`
}

// JiraChangelogResponse represents the changelog response from JIRA API
type JiraChangelogResponse struct {
	Expand     string          `json:"expand"`
	StartAt    int             `json:"startAt"`
	MaxResults int             `json:"maxResults"`
	Total      int             `json:"total"`
	IsLast     bool            `json:"isLast"`
	Values     []JiraChangelog `json:"values"`
}

// JiraChangelog represents a single changelog entry
type JiraChangelog struct {
	ID      string              `json:"id"`
	Created string              `json:"created"`
	Items   []JiraChangelogItem `json:"items"`
}

// JiraChangelogItem represents a field change in a changelog
type JiraChangelogItem struct {
	Field      string `json:"field"`
	FieldType  string `json:"fieldtype"`
	From       string `json:"from"`
	FromString string `json:"fromString"`
	To         string `json:"to"`
	ToString   string `json:"toString"`
}
