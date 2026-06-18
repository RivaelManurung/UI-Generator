package repositories

import (
	"context"
	"errors"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/kreasinusantara/ui-generator-backend/internal/domain"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/metrics"
)

type MockTxManager struct {
	mu sync.Mutex
}

func (m *MockTxManager) WithTx(ctx context.Context, fn func(ctx context.Context) error) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	return fn(ctx)
}

type MockUserRepository struct {
	mu     sync.RWMutex
	users  map[string]domain.User
	emails map[string]string
}

func NewMockUserRepository() *MockUserRepository {
	return &MockUserRepository{
		users:  make(map[string]domain.User),
		emails: make(map[string]string),
	}
}

func (r *MockUserRepository) Create(ctx context.Context, user domain.User) (domain.User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.emails[strings.ToLower(user.Email)]; exists {
		return domain.User{}, errors.New("email already exists")
	}
	r.users[user.ID] = user
	r.emails[strings.ToLower(user.Email)] = user.ID
	return user, nil
}

func (r *MockUserRepository) FindByID(ctx context.Context, id string) (domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	user, ok := r.users[id]
	if !ok {
		return domain.User{}, errors.New("user not found")
	}
	return user, nil
}

func (r *MockUserRepository) FindByEmail(ctx context.Context, email string) (domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	id, ok := r.emails[strings.ToLower(email)]
	if !ok {
		return domain.User{}, errors.New("user not found")
	}
	return r.users[id], nil
}

func (r *MockUserRepository) List(ctx context.Context) ([]domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	users := make([]domain.User, 0, len(r.users))
	for _, u := range r.users {
		users = append(users, u)
	}
	return users, nil
}

type MockRefreshTokenRepository struct {
	mu     sync.RWMutex
	tokens map[string]RefreshToken
	hashes map[string]string
}

func NewMockRefreshTokenRepository() *MockRefreshTokenRepository {
	return &MockRefreshTokenRepository{
		tokens: make(map[string]RefreshToken),
		hashes: make(map[string]string),
	}
}

func (r *MockRefreshTokenRepository) Create(ctx context.Context, token RefreshToken) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.tokens[token.ID] = token
	r.hashes[token.Hash] = token.ID
	return nil
}

func (r *MockRefreshTokenRepository) FindByHash(ctx context.Context, hash string) (RefreshToken, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	id, ok := r.hashes[hash]
	if !ok {
		return RefreshToken{}, errors.New("token not found")
	}
	return r.tokens[id], nil
}

func (r *MockRefreshTokenRepository) Revoke(ctx context.Context, id string, revokedAt time.Time) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	token, ok := r.tokens[id]
	if !ok {
		return errors.New("token not found")
	}
	token.RevokedAt = &revokedAt
	r.tokens[id] = token
	return nil
}

func (r *MockRefreshTokenRepository) RevokeFamily(ctx context.Context, rotatedFromID string, revokedAt time.Time) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	// Simplified mock: just revoke the one token
	token, ok := r.tokens[rotatedFromID]
	if ok {
		token.RevokedAt = &revokedAt
		r.tokens[rotatedFromID] = token
	}
	return nil
}

type MockProjectRepository struct {
	mu       sync.RWMutex
	projects map[string]domain.Project
}

func NewMockProjectRepository() *MockProjectRepository {
	return &MockProjectRepository{projects: make(map[string]domain.Project)}
}

func (r *MockProjectRepository) ListByUser(ctx context.Context, userID string) ([]domain.Project, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	res := []domain.Project{}
	for _, p := range r.projects {
		if p.UserID == userID {
			res = append(res, p)
		}
	}
	sort.Slice(res, func(i, j int) bool { return res[i].CreatedAt.Before(res[j].CreatedAt) })
	return res, nil
}

func (r *MockProjectRepository) Create(ctx context.Context, project domain.Project) (domain.Project, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.projects[project.ID] = project
	return project, nil
}

func (r *MockProjectRepository) FindOwned(ctx context.Context, userID string, projectID string) (domain.Project, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	p, ok := r.projects[projectID]
	if !ok || p.UserID != userID {
		return domain.Project{}, errors.New("project not found")
	}
	return p, nil
}

func (r *MockProjectRepository) UpdateOwned(ctx context.Context, userID string, project domain.Project) (domain.Project, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	p, ok := r.projects[project.ID]
	if !ok || p.UserID != userID {
		return domain.Project{}, errors.New("project not found")
	}
	r.projects[project.ID] = project
	return project, nil
}

func (r *MockProjectRepository) SoftDeleteOwned(ctx context.Context, userID string, projectID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	p, ok := r.projects[projectID]
	if ok && p.UserID == userID {
		delete(r.projects, projectID)
	}
	return nil
}

type MockPageRepository struct {
	mu    sync.RWMutex
	pages map[string]domain.Page
}

func NewMockPageRepository() *MockPageRepository {
	return &MockPageRepository{pages: make(map[string]domain.Page)}
}

func (r *MockPageRepository) CreateOwned(ctx context.Context, userID string, page domain.Page) (domain.Page, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.pages[page.ID] = page
	return page, nil
}

func (r *MockPageRepository) FindOwned(ctx context.Context, userID string, pageID string) (domain.Page, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	p, ok := r.pages[pageID]
	if !ok {
		return domain.Page{}, errors.New("page not found")
	}
	// Note: userID check omitted for simplicity if not needed in mock or assuming project/page mapping handled elsewhere
	return p, nil
}

func (r *MockPageRepository) ListByOwnedProject(ctx context.Context, userID string, projectID string) ([]domain.Page, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	res := []domain.Page{}
	for _, p := range r.pages {
		if p.ProjectID == projectID {
			res = append(res, p)
		}
	}
	sort.Slice(res, func(i, j int) bool { return res[i].CreatedAt.Before(res[j].CreatedAt) })
	return res, nil
}

func (r *MockPageRepository) SetCurrentVersion(ctx context.Context, userID string, pageID string, versionID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	p, ok := r.pages[pageID]
	if ok {
		p.CurrentVersionID = versionID
		r.pages[pageID] = p
	}
	return nil
}

func (r *MockPageRepository) UpdateOwned(ctx context.Context, userID string, page domain.Page) (domain.Page, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.pages[page.ID] = page
	return page, nil
}

func (r *MockPageRepository) SoftDeleteOwned(ctx context.Context, userID string, pageID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.pages, pageID)
	return nil
}

type MockPageVersionRepository struct {
	mu       sync.RWMutex
	versions map[string][]domain.PageVersion
}

func NewMockPageVersionRepository() *MockPageVersionRepository {
	return &MockPageVersionRepository{versions: make(map[string][]domain.PageVersion)}
}

func (r *MockPageVersionRepository) Create(ctx context.Context, version domain.PageVersion) (domain.PageVersion, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.versions[version.PageID] = append(r.versions[version.PageID], version)
	return version, nil
}

func (r *MockPageVersionRepository) ListOwnedByPage(ctx context.Context, userID string, pageID string) ([]domain.PageVersion, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.versions[pageID], nil
}

func (r *MockPageVersionRepository) UpdateGeneratedCode(ctx context.Context, versionID string, code string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for pageID, vs := range r.versions {
		for i := range vs {
			if vs[i].ID == versionID {
				r.versions[pageID][i].GeneratedCode = code
				return nil
			}
		}
	}
	return nil
}

func (r *MockPageVersionRepository) FindOwned(ctx context.Context, userID string, pageID string, versionID string) (domain.PageVersion, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, v := range r.versions[pageID] {
		if v.ID == versionID {
			return v, nil
		}
	}
	return domain.PageVersion{}, errors.New("version not found")
}

func (r *MockPageVersionRepository) NextVersionNumber(ctx context.Context, pageID string) (int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.versions[pageID]) + 1, nil
}

type MockGenerationJobRepository struct {
	mu   sync.RWMutex
	jobs map[string]domain.GenerationJob
}

func NewMockGenerationJobRepository() *MockGenerationJobRepository {
	return &MockGenerationJobRepository{jobs: make(map[string]domain.GenerationJob)}
}

func (r *MockGenerationJobRepository) Create(ctx context.Context, job domain.GenerationJob) (domain.GenerationJob, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.jobs[job.ID] = job
	metrics.IncJobStatus(job.Status)
	return job, nil
}

func (r *MockGenerationJobRepository) FindByRequestID(ctx context.Context, requestID string) (domain.GenerationJob, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, j := range r.jobs {
		if j.RequestID == requestID {
			return j, nil
		}
	}
	return domain.GenerationJob{}, errors.New("job not found")
}

func (r *MockGenerationJobRepository) FindOwned(ctx context.Context, userID string, jobID string) (domain.GenerationJob, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	j, ok := r.jobs[jobID]
	if !ok || j.UserID != userID {
		return domain.GenerationJob{}, errors.New("job not found")
	}
	return j, nil
}

func (r *MockGenerationJobRepository) ListForAdmin(ctx context.Context) ([]domain.GenerationJob, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	res := []domain.GenerationJob{}
	for _, j := range r.jobs {
		res = append(res, j)
	}
	return res, nil
}

func (r *MockGenerationJobRepository) UpdateStatus(ctx context.Context, jobID string, status string, errorMessage string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	j, ok := r.jobs[jobID]
	if ok {
		j.Status = status
		j.ErrorMessage = errorMessage
		j.UpdatedAt = time.Now().UTC()
		r.jobs[jobID] = j
		metrics.IncJobStatus(status)
	}
	return nil
}

type MockCreditWalletRepository struct {
	mu      sync.RWMutex
	wallets map[string]domain.CreditWallet
}

func NewMockCreditWalletRepository() *MockCreditWalletRepository {
	return &MockCreditWalletRepository{wallets: make(map[string]domain.CreditWallet)}
}

func (r *MockCreditWalletRepository) GetForUpdate(ctx context.Context, userID string) (domain.CreditWallet, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	w, ok := r.wallets[userID]
	if !ok {
		return domain.CreditWallet{UserID: userID, Balance: 0}, nil
	}
	return w, nil
}

func (r *MockCreditWalletRepository) Upsert(ctx context.Context, wallet domain.CreditWallet) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.wallets[wallet.UserID] = wallet
	return nil
}

type MockCreditTransactionRepository struct {
	mu sync.RWMutex
	tx []domain.CreditTransaction
}

func NewMockCreditTransactionRepository() *MockCreditTransactionRepository {
	return &MockCreditTransactionRepository{tx: []domain.CreditTransaction{}}
}

func (r *MockCreditTransactionRepository) Create(ctx context.Context, tx domain.CreditTransaction) (domain.CreditTransaction, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.tx = append(r.tx, tx)
	return tx, nil
}

func (r *MockCreditTransactionRepository) ListByUser(ctx context.Context, userID string) ([]domain.CreditTransaction, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	res := []domain.CreditTransaction{}
	for _, t := range r.tx {
		if t.UserID == userID {
			res = append(res, t)
		}
	}
	return res, nil
}

func (r *MockCreditTransactionRepository) FindByIdempotencyKey(ctx context.Context, userID string, key string) (domain.CreditTransaction, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, t := range r.tx {
		if t.UserID == userID && t.IdempotencyKey == key {
			return t, nil
		}
	}
	return domain.CreditTransaction{}, errors.New("transaction not found")
}

type MockThemeRepository struct {
	themes []domain.Theme
}

func NewMockThemeRepository(themes []domain.Theme) *MockThemeRepository {
	return &MockThemeRepository{themes: themes}
}

func (r *MockThemeRepository) List(ctx context.Context) ([]domain.Theme, error) {
	return r.themes, nil
}

type MockTemplateRepository struct {
	templates []domain.Template
}

func NewMockTemplateRepository(templates []domain.Template) *MockTemplateRepository {
	return &MockTemplateRepository{templates: templates}
}

func (r *MockTemplateRepository) List(ctx context.Context) ([]domain.Template, error) {
	return r.templates, nil
}

type MockAuditLogRepository struct {
	mu   sync.RWMutex
	logs []AuditLog
}

func NewMockAuditLogRepository() *MockAuditLogRepository {
	return &MockAuditLogRepository{logs: []AuditLog{}}
}

func (r *MockAuditLogRepository) Create(ctx context.Context, log AuditLog) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.logs = append(r.logs, log)
	return nil
}

func (r *MockAuditLogRepository) ListForAdmin(ctx context.Context) ([]AuditLog, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.logs, nil
}

type MockIdempotencyKeyRepository struct {
	mu   sync.RWMutex
	keys map[string]IdempotencyKey
}

func NewMockIdempotencyKeyRepository() *MockIdempotencyKeyRepository {
	return &MockIdempotencyKeyRepository{keys: make(map[string]IdempotencyKey)}
}

func (r *MockIdempotencyKeyRepository) Create(ctx context.Context, key IdempotencyKey) (IdempotencyKey, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.keys[key.UserID+":"+key.Operation+":"+key.RequestKey] = key
	return key, nil
}

func (r *MockIdempotencyKeyRepository) Find(ctx context.Context, userID string, operation string, requestKey string) (IdempotencyKey, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	k, ok := r.keys[userID+":"+operation+":"+requestKey]
	if !ok {
		return IdempotencyKey{}, errors.New("key not found")
	}
	return k, nil
}
