import fastifyCors from '@fastify/cors';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { ImpressionWriter } from '@/domain/impression-writer';
import type { ImpressionQueryService } from '@/query/impression-query-service';

type Params = {
  port: number;
  cors: { origins: string[] };
  impressionWriter: ImpressionWriter;
  impressionQueryService: ImpressionQueryService;
};

export class AppServer {
  private readonly port: number;
  private readonly app = Fastify({ logger: false })
    .withTypeProvider<ZodTypeProvider>()
    .setValidatorCompiler(validatorCompiler)
    .setSerializerCompiler(serializerCompiler);

  private started = false;

  constructor({ port, cors, impressionWriter, impressionQueryService }: Params) {
    this.port = port;

    this.app.register(fastifyCors, { origin: cors.origins });

    this.app.get('/healthz', async (_req: FastifyRequest, reply: FastifyReply) => {
      return reply.code(200).send();
    });

    const zStatsQueryParams = z.object({ timeWindowMinutes: z.coerce.number().positive() });
    this.app.get('/stats', { schema: { querystring: zStatsQueryParams } }, async (req, reply) => {
      const stats = await impressionQueryService.getImpressionsByAdId(req.query);
      return reply.send(stats);
    });

    const zEventBody = z.object({ id: z.string(), ts: z.number(), userId: z.string(), adId: z.string() });
    this.app.post('/event', { schema: { body: zEventBody } }, async (req, reply) => {
      await impressionWriter.write(req.body);
      return reply.code(204).send();
    });
  }

  public async start() {
    if (this.started) return;
    await this.app.listen({ port: this.port, host: '0.0.0.0' });
    console.log(`Server running on port :${this.getPort()}`);
    this.started = true;
  }

  public getPort(): number {
    const address = this.app.server.address();
    if (!address) throw new Error('Server not started');
    if (typeof address === 'string') return parseInt(address.split(':').pop() || '0', 10);
    return address.port;
  }

  public async stop() {
    await this.app.close();
    this.started = false;
  }
}
