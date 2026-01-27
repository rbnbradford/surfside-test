# Surfside Test

System for ingestion of impression events that can be queried for analytics providing data de-duplication.

### Requirements

- docker & docker compose
- make
- Node (using `25.4.0`)

### To Run

- `make copy-env` copies .sample.env to .env for api and worker (suitable for local development)
- `make up-prod` starts all containers built to production stage
- or `make up` starts all containers using ts-node-dev with volumes and hot reloading of code

### To Run Load Tests

- `make up-prod`
- `make loadtest-events`
- or `make loadtest-stats`

### Example Requests

requests can be seen here: [here](./packages/api/api.http)

stats response format is:
```
   { [adId]: count }
```

### Performance validation

load tests scripts use k6 to validate performance under load hitting the endpoints with randomized impression bodies

load tests assume a plugged-in laptop with at least eight core cpu (pm2 is used for multi-process)

### To Run Integration Tests

The system has essentially 0 business logic and to achieve durability and performance relies on infrastructure\
Therefore, only infrastructure tests have been included, each tests the boundaries of the api and the worker\
api is tested from http call through to validation of events produced to kafka\
worker is tested from kafka events through to validation of clickhouse data

- assumed using node v25.4.0, if you have nvm `nvm insall` and `nvm use`
- `npm install`
- tests will start containers they rely on, make sure compose is down to avoid conflights `make down`
- `npm run test:integration`
