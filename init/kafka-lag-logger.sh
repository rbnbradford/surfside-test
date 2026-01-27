#!/bin/sh

THRESHOLD=500

while true; do
  echo "=== Kafka Consumer Lag ($(date)) ==="

  curl -s kafka-lag-exporter:8000/metrics |
    grep '^kafka_consumergroup_group_lag{' |
    awk -v THRESHOLD="$THRESHOLD" '
    {
      line=$0

      topic=line
      sub(/.*topic="/,"",topic); sub(/".*/,"",topic)

      group=line
      sub(/.*group="/,"",group); sub(/".*/,"",group)

      lag = $NF + 0   # FORCE numeric

      key = group "/" topic
      sum[key] = sum[key] + lag
      if (lag > max[key]) max[key] = lag
    }
    END {
      for (k in sum) {
        warn = (sum[k] >= THRESHOLD) ? " ⚠️ BACKPRESSURE" : ""
        printf "%s sum=%d max=%d%s\n", k, sum[k], max[k], warn
      }
    }'

  echo ""
  sleep 10
done
