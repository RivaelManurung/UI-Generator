package queue

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/kreasinusantara/ui-generator-backend/internal/platform/redis"
	goredis "github.com/redis/go-redis/v9"
)

const DefaultGenerationStream = "generation_jobs"

type GenerationTask struct {
	JobID        string    `json:"jobId"`
	UserID       string    `json:"userId"`
	Operation    string    `json:"operation"`
	SectionIndex int       `json:"sectionIndex"`
	QueuedAt     time.Time `json:"queuedAt"`
}

type Producer struct {
	client      *redis.Client
	stream      string
	EnqueueFunc func(ctx context.Context, task GenerationTask) error
}

func NewProducer(client *redis.Client, stream string) *Producer {
	if stream == "" {
		stream = DefaultGenerationStream
	}
	return &Producer{client: client, stream: stream}
}

func (p *Producer) EnqueueGeneration(ctx context.Context, task GenerationTask) error {
	if p == nil {
		return errors.New("queue producer is not configured")
	}
	if p.EnqueueFunc != nil {
		return p.EnqueueFunc(ctx, task)
	}
	if p.client == nil {
		return errors.New("redis client is not configured for producer")
	}
	if task.QueuedAt.IsZero() {
		task.QueuedAt = time.Now().UTC()
	}
	raw, err := json.Marshal(task)
	if err != nil {
		return err
	}
	return p.client.XAdd(ctx, &goredis.XAddArgs{
		Stream: p.stream,
		Values: map[string]interface{}{"payload": string(raw)},
	}).Err()
}
