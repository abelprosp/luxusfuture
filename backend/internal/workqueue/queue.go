package workqueue

import (
	"sync"
)

type Processor func(payload string)

type Queue struct {
	ch        chan string
	workers   int
	processor Processor
	wg        sync.WaitGroup
}

func New(workers int, buf int, fn Processor) *Queue {
	if workers < 1 {
		workers = 4
	}
	if buf < 8 {
		buf = 64
	}
	return &Queue{
		ch:        make(chan string, buf),
		workers:   workers,
		processor: fn,
	}
}

func (q *Queue) Start() {
	for i := 0; i < q.workers; i++ {
		q.wg.Add(1)
		go func() {
			defer q.wg.Done()
			for id := range q.ch {
				if q.processor != nil {
					q.processor(id)
				}
			}
		}()
	}
}

func (q *Queue) Enqueue(id string) {
	q.ch <- id
}

func (q *Queue) Close() {
	close(q.ch)
	q.wg.Wait()
}
