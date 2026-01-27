#!/bin/sh
set -e

echo "Waiting for Kafka to be ready..."
until /opt/kafka/bin/kafka-broker-api-versions.sh --bootstrap-server kafka:9092; do
  sleep 2
done

echo 'Creating Kafka topics...'

/opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:9092 --create --if-not-exists \
  --topic impressions \
  --partitions 16 \
  --replication-factor 1 \
  --config retention.ms=86400000 \
  --config cleanup.policy=delete

echo 'Kafka topics ready ✅'