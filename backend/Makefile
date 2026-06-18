.PHONY: fmt vet lint test test-race test-cover security vuln migration-check build smoke-test qa

GO := /usr/local/go/bin/go

fmt:
	$(GO) fmt ./...

vet:
	$(GO) vet ./...

lint:
	golangci-lint run ./...

test:
	$(GO) test -v ./...

test-race:
	$(GO) test -v -race ./...

test-cover:
	$(GO) test -v -coverprofile=coverage.out ./...

security:
	gosec ./...

vuln:
	govulncheck ./...

migration-check:
	# Verifies migrations up/down idempotency
	$(GO) test -v ./internal/platform/postgres -run TestMigrationsIdempotency

build:
	$(GO) build ./...

smoke-test:
	# Implement a basic smoke-test behavior
	@echo "Running build smoke test..."
	$(GO) build -o /dev/null ./cmd/api
	$(GO) build -o /dev/null ./cmd/worker
	@echo "Smoke test passed!"

qa: fmt vet lint test test-race security vuln build smoke-test
	@echo "QA pipeline passed successfully!"
