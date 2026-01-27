import { type ClickHouseClient, createClient } from '@clickhouse/client';
import type { NodeClickHouseClientConfigOptions } from '@clickhouse/client/dist/config';
import type { ImpressionQueryService } from '@/query/impression-query-service';

type Params = {
  clickhouseConfig: NodeClickHouseClientConfigOptions;
  table: string;
};

export class ImpressionQueryServiceClickhouse implements ImpressionQueryService {
  private readonly client: ClickHouseClient;
  private readonly table: string;

  constructor({ clickhouseConfig, table }: Params) {
    this.client = createClient(clickhouseConfig);
    this.table = table;
  }

  public async getImpressionsByAdId({
    timeWindowMinutes,
  }: {
    timeWindowMinutes: number;
  }): Promise<Record<string, number>> {
    const query = `
          SELECT ad_id, count() as count
          FROM ${this.table}
          WHERE ts > now() - INTERVAL ${timeWindowMinutes} MINUTE
          GROUP BY ad_id;`;
    const result = await this.client.query({ query });
    const rows = await result.json<{ ad_id: string; count: number }>();
    const counts = rows.data.map((row) => [row.ad_id, row.count]);
    return Object.fromEntries(counts);
  }
}
