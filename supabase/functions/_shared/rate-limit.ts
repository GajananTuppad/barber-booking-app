import { Redis } from 'npm:@upstash/redis@1';

let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (redisClient) return redisClient;
  const url = Deno.env.get('UPSTASH_REDIS_URL');
  const token = Deno.env.get('UPSTASH_REDIS_TOKEN');
  if (!url || !token) {
    throw new Error('Missing UPSTASH_REDIS_URL or UPSTASH_REDIS_TOKEN');
  }
  redisClient = new Redis({ url, token });
  return redisClient;
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown';
  return req.headers.get('cf-connecting-ip') ?? 'unknown';
}

/** Fixed-window rate limit keyed by client IP + function name. Returns true if the request is within the limit. */
export async function checkRateLimit(
  req: Request,
  functionName: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const ip = clientIp(req);
  const redis = getRedisClient();
  const key = `rate-limit:${functionName}:${ip}`;

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }

  return count <= limit;
}
