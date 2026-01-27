# Surfside Test

## Architecture

### Overview

1. Impression events are consumed via the http api at endpoint `/event`
2. impressions are validated and persisted to kafka topic `impressions` partitioned by `id`
3. impressions are consumed from kafka topic `impressions` by worker
4. impressions are deduplicated and persisted to clickhouse
5. recent impression frequency can be queried from api at endpont `/stats` using query parameter `?timeWindowMinutes=N`

### Api:

Node http server written in typescript

using Fastify: good balance of adoption, performance and developer friendly api

using zod: developer friendly expressive validation library

using pm2: industry standard approach to running and managing multiple processes providing monitoring and automatic restart, gains extra performance from using multiple cores

the api service does not perform deduplication to ensure high throughput

### Kafka:

Extremely performant to offload individual events from the api.

partitioning gives us an easy way to scale horizontally with workers.

partitioning by impression.id means any duplicate impressions will be within the same partition.

### Clickhouse:

Clickhouse is optimized for analytical queries

suits the needs of merely appending data and querying across time

### Valkey:

Essentially FOSS version of redis

Extremely performant for low latency reads and writes allowing deduplication across batches of previously seen impressions.

Built-in expiry on keys can allow for previously seen impressions to be valid again after 24 hour window.

Uses AOF for resilience across restarts.

### Worker:

Node application to consume from kafka impressions topic

Scaled within a single container using pm2 so individual processes can each join the consumer group and be allocated separate partitions

Deduplicates impressions within a single batch in process which will catch any duplicates sent in quick succession

Deduplication is then performed using batch functionality with valkey to find previously seen events. 
Events are then batch saved to clickhouse.
The novel events are then stored in valkey.

## Reasoning

- Individual saves to clickhouse would be slow and hurt throughput
- Batch processes cut down network time greatly
- kafka and workers allow efficient batching
- In memory deduplication is not resilient or horizontally scalable seen impressions would be lost across restarts.
- A small increase in lag time for impressions is acceptable in exchange for the improved resilience and throughput.

## Improvements

- Views per adId could be aggregated into minute blocks, allowing more performant but less accurate queries
- Query endpoint should be moved to another service so that it doesn't impact event ingestion
- When deployed, api should be horizontally scaled behind a loadbalancer according to throughput needs (pm2 can still be used if the container has multiple cores internally)
- When deployed, worker should be horizontally scaled as above