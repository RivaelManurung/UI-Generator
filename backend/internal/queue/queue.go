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


type Consumer struct {
	client *redis.Client
	stream string
	group  string
	name   string
}

func NewConsumer(client *redis.Client, stream string, group string, name string) *Consumer {
	if stream == "" {
		stream = DefaultGenerationStream
	}
	if group == "" {
		group = "generation-workers"
	}
	if name == "" {
		name = "worker"
	}
	return &Consumer{client: client, stream: stream, group: group, name: name}
}

func (c *Consumer) EnsureGroup(ctx context.Context) error {
	if c == nil || c.client == nil {
		return errors.New("queue consumer is not configured")
	}
	err := c.client.XGroupCreateMkStream(ctx, c.stream, c.group, "0").Err()
	if err != nil && err.Error() != "BUSYGROUP Consumer Group name already exists" {
		return err
	}
	return nil
}

func (c *Consumer) ReadPending(ctx context.Context, count int64, block time.Duration) ([]goredis.XMessage, error) {
	if c == nil || c.client == nil {
		return nil, errors.New("queue consumer is not configured")
	}
	streams, err := c.client.XReadGroup(ctx, &goredis.XReadGroupArgs{
		Group:    c.group,
		Consumer: c.name,
		Streams:  []string{c.stream, ">"},
		Count:    count,
		Block:    block,
	}).Result()
	if err != nil {
		if errors.Is(err, goredis.Nil) {
			return nil, nil
		}
		return nil, err
	}
	if len(streams) == 0 {
		return nil, nil
	}
	return streams[0].Messages, nil
}

func (c *Consumer) Ack(ctx context.Context, messageID string) error {
	if c == nil || c.client == nil {
		return errors.New("queue consumer is not configured")
	}
	return c.client.XAck(ctx, c.stream, c.group, messageID).Err()
}

type PendingMessage struct {
	ID       string
	Payload  string
	Attempts int64
	IsFailed bool
}

func (c *Consumer) ClaimPending(ctx context.Context, minIdleTime time.Duration, count int64) ([]PendingMessage, error) {
	if c == nil || c.client == nil {
		return nil, errors.New("queue consumer is not configured")
	}

	infos, err := c.client.XPendingExt(ctx, &goredis.XPendingExtArgs{
		Stream: c.stream,
		Group:  c.group,
		Start:  "-",
		End:    "+",
		Count:  count,
		Idle:   minIdleTime,
	}).Result()
	if err != nil {
		if errors.Is(err, goredis.Nil) {
			return nil, nil
		}
		return nil, err
	}

	if len(infos) == 0 {
		return nil, nil
	}

	var messageIDs []string
	attemptsMap := make(map[string]int64)
	for _, info := range infos {
		messageIDs = append(messageIDs, info.ID)
		attemptsMap[info.ID] = info.RetryCount
	}

	claimed, err := c.client.XClaim(ctx, &goredis.XClaimArgs{
		Stream:   c.stream,
		Group:    c.group,
		Consumer: c.name,
		MinIdle:  minIdleTime,
		Messages: messageIDs,
	}).Result()
	if err != nil {
		return nil, err
	}

	res := make([]PendingMessage, 0, len(claimed))
	for _, msg := range claimed {
		payload, _ := msg.Values["payload"].(string)
		attempts := attemptsMap[msg.ID]
		res = append(res, PendingMessage{
			ID:       msg.ID,
			Payload:  payload,
			Attempts: attempts,
			IsFailed: attempts > 3,
		})
	}

	return res, nil
}
