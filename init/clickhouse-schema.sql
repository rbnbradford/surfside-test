CREATE DATABASE IF NOT EXISTS impressions_db;

CREATE TABLE IF NOT EXISTS impressions_db.impressions (
                                                          id UUID,
                                                          ts DateTime64(3),
                                                          user_id UUID,
                                                          ad_id UUID,
                                                          inserted_at DateTime DEFAULT now()
    ) ENGINE = MergeTree()
    PARTITION BY toYYYYMMDD(ts)
    ORDER BY (ad_id, ts)
    SETTINGS index_granularity = 8192;