package logger

import (
	"encoding/json"
	"log"
	"os"
	"time"
)

type Logger struct {
	base *log.Logger
}

func New() Logger {
	return Logger{base: log.New(os.Stdout, "", 0)}
}

func (l Logger) Info(message string, fields map[string]interface{}) {
	l.write("info", message, fields)
}

func (l Logger) Error(message string, fields map[string]interface{}) {
	l.write("error", message, fields)
}

func (l Logger) write(level, message string, fields map[string]interface{}) {
	event := map[string]interface{}{
		"level":   level,
		"message": message,
		"time":    time.Now().UTC().Format(time.RFC3339Nano),
	}
	for key, value := range fields {
		event[key] = value
	}
	raw, err := json.Marshal(event)
	if err != nil {
		l.base.Printf(`{"level":"error","message":"failed to marshal log event"}`)
		return
	}
	l.base.Println(string(raw))
}
