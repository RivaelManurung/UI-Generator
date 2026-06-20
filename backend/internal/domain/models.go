package domain

import "time"

type Project struct {
	ID               string    `json:"id"`
	UserID           string    `json:"userId,omitempty"`
	Name             string    `json:"name"`
	Description      string    `json:"description"`
	Status           string    `json:"status,omitempty"`
	DefaultThemeSlug string    `json:"defaultThemeSlug"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type Page struct {
	ID               string       `json:"id"`
	ProjectID        string       `json:"projectId"`
	Name             string       `json:"name"`
	Slug             string       `json:"slug"`
	PageType         string       `json:"pageType"`
	CurrentVersionID string       `json:"currentVersionId"`
	CurrentVersion   *PageVersion `json:"currentVersion,omitempty"`
	CreatedAt        time.Time    `json:"createdAt"`
	UpdatedAt        time.Time    `json:"updatedAt"`
}

type PageVersion struct {
	ID            string                 `json:"id"`
	PageID        string                 `json:"pageId"`
	VersionNumber int                    `json:"versionNumber"`
	Prompt        string                 `json:"prompt"`
	SchemaJSON    map[string]interface{} `json:"schemaJson"`
	GeneratedCode string                 `json:"generatedCode"`
	QualityScore  float64                `json:"qualityScore"`
	CreatedBy     string                 `json:"createdBy,omitempty"`
	CreatedAt     time.Time              `json:"createdAt"`
}

type GenerationJob struct {
	ID           string    `json:"id"`
	UserID       string    `json:"userId,omitempty"`
	ProjectID    string    `json:"projectId"`
	PageID       string    `json:"pageId"`
	RequestID    string    `json:"requestId"`
	Status       string    `json:"status"`
	Prompt       string    `json:"prompt"`
	PageType     string    `json:"pageType,omitempty"`
	Domain       string    `json:"domain,omitempty"`
	ThemeSlug    string    `json:"themeSlug,omitempty"`
	OutputMode   string    `json:"outputMode,omitempty"`
	CreditCost   int       `json:"creditCost"`
	ErrorMessage string    `json:"errorMessage,omitempty"`
	RetryCount   int       `json:"retryCount"`
	StartedAt    time.Time `json:"startedAt"`
	FinishedAt   time.Time `json:"finishedAt"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type CreditWallet struct {
	UserID       string              `json:"userId,omitempty"`
	Balance      int                 `json:"balance"`
	Transactions []CreditTransaction `json:"transactions"`
}

type CreditTransaction struct {
	ID             string    `json:"id"`
	UserID         string    `json:"userId,omitempty"`
	Type           string    `json:"type"`
	Amount         int       `json:"amount"`
	BalanceAfter   int       `json:"balanceAfter"`
	ReferenceType  string    `json:"referenceType,omitempty"`
	ReferenceID    string    `json:"referenceId"`
	IdempotencyKey string    `json:"idempotencyKey,omitempty"`
	Description    string    `json:"description"`
	CreatedAt      time.Time `json:"createdAt"`
}

type User struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type AuthSession struct {
	User         User   `json:"user"`
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresAt    int64  `json:"expiresAt"`
}

type Theme struct {
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	Accent      string `json:"accent"`
	Library     string `json:"library"`
	Description string `json:"description"`
}

type Template struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Domain        string `json:"domain"`
	PageType      string `json:"pageType"`
	ComponentHint int    `json:"componentHint"`
	Tier          string `json:"tier"`
	Description   string `json:"description"`
}
