package metrics

import (
	"sync/atomic"
)

type Metrics struct {
	RequestCount      uint64
	ErrorCount        uint64
	AIFailures        uint64
	QueueRetries      uint64
	JobStatusQueued   uint64
	JobStatusProc     uint64
	JobStatusSuccess  uint64
	JobStatusFailed   uint64
	JobStatusRefunded uint64
}

var (
	GlobalMetrics = &Metrics{}
)

func IncRequest() {
	atomic.AddUint64(&GlobalMetrics.RequestCount, 1)
}

func IncError() {
	atomic.AddUint64(&GlobalMetrics.ErrorCount, 1)
}

func IncAIFailure() {
	atomic.AddUint64(&GlobalMetrics.AIFailures, 1)
}

func IncJobStatus(status string) {
	switch status {
	case "queued":
		atomic.AddUint64(&GlobalMetrics.JobStatusQueued, 1)
	case "processing", "analyzing", "generating_schema", "validating_schema", "rendering_code":
		atomic.AddUint64(&GlobalMetrics.JobStatusProc, 1)
	case "succeeded":
		atomic.AddUint64(&GlobalMetrics.JobStatusSuccess, 1)
	case "failed":
		atomic.AddUint64(&GlobalMetrics.JobStatusFailed, 1)
	case "refunded":
		atomic.AddUint64(&GlobalMetrics.JobStatusRefunded, 1)
	}
}

func GetSummary() map[string]interface{} {
	return map[string]interface{}{
		"requestCount":       atomic.LoadUint64(&GlobalMetrics.RequestCount),
		"errorCount":         atomic.LoadUint64(&GlobalMetrics.ErrorCount),
		"aiProviderFailures": atomic.LoadUint64(&GlobalMetrics.AIFailures),
		"queueRetryCount":    atomic.LoadUint64(&GlobalMetrics.QueueRetries),
		"jobsByStatus": map[string]uint64{
			"queued":     atomic.LoadUint64(&GlobalMetrics.JobStatusQueued),
			"processing": atomic.LoadUint64(&GlobalMetrics.JobStatusProc),
			"succeeded":  atomic.LoadUint64(&GlobalMetrics.JobStatusSuccess),
			"failed":     atomic.LoadUint64(&GlobalMetrics.JobStatusFailed),
			"refunded":   atomic.LoadUint64(&GlobalMetrics.JobStatusRefunded),
		},
	}
}
