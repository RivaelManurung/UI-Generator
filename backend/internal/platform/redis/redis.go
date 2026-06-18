package redis

import (
	"context"
	"errors"

	goredis "github.com/redis/go-redis/v9"
)

type Client struct {
	*goredis.Client
	URL string
}

func Open(redisURL string) (*Client, error) {
	if redisURL == "" {
		return nil, errors.New("REDIS_URL is required")
	}
	options, err := goredis.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}
	return &Client{Client: goredis.NewClient(options), URL: redisURL}, nil
}

func Ping(ctx context.Context, redisURL string) error {
	client, err := Open(redisURL)
	if err != nil {
		return err
	}
	defer client.Close()
	return client.Ping(ctx).Err()
}
