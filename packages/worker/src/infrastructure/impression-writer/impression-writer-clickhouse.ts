import { type ClickHouseClient, createClient } from '@clickhouse/client';
import type { NodeClickHouseClientConfigOptions } from '@clickhouse/client/dist/config';
import type { Impression } from '@surfside/lib';
import type { ImpressionWriter } from '@/domain/impression-writer';

type Params = {
  clickhouseConfig: NodeClickHouseClientConfigOptions;
  table: string;
};

export class ImpressionWriterClickhouse implements ImpressionWriter {
  private readonly client: ClickHouseClient;
  private readonly table: string;

  constructor({ clickhouseConfig, table }: Params) {
    this.client = createClient(clickhouseConfig);
    this.table = table;
  }

  private mapImpressionToDb = (impression: Impression) => ({
    id: impression.id,
    ts: impression.ts,
    user_id: impression.userId,
    ad_id: impression.adId,
  });

  public async writeMany(impressions: readonly Impression[]) {
    await this.client.insert({
      table: this.table,
      format: 'JSONEachRow',
      values: impressions.map(this.mapImpressionToDb),
    });
  }
}
