COMPOSE = docker compose
BASE = -f docker-compose.yml
PROD = -f docker-compose.yml -f docker-compose.prod.yml

.PHONY: up
up: down
	$(COMPOSE) $(BASE) up --build -d

.PHONY: up-prod
up-prod: down
	$(COMPOSE) $(PROD) up --build -d

.PHONY: down
down:
	$(COMPOSE) $(BASE) down -v
	$(COMPOSE) $(PROD) down -v

.PHONY: copy-env
copy-env:
	@test -f ./packages/api/env/.env && echo "⊘ packages/api/.env already exists" || (cp ./packages/api/env/.env.sample ./packages/api/env/.env && echo "✓ Created packages/api/.env")
	@test -f ./packages/worker/env/.env && echo "⊘ packages/worker/.env already exists" || (cp ./packages/worker/env/.env.sample ./packages/worker/env/.env && echo "✓ Created packages/worker/.env")

.PHONY: loadtest-events
loadtest-events:
	docker run --rm -i --network surfside-test -v ./loadtest/k6:/work:ro -w /work grafana/k6 run loadtest-event.js

.PHONY: loadtest-stats
loadtest-stats:
	docker run --rm -i --network surfside-test -v ./loadtest/k6:/work:ro -w /work grafana/k6 run loadtest-stats.js
