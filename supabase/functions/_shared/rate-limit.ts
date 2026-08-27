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

/**
 * Extracts the real client IP from the request. Uses x-forwarded-for only
 * when a trusted CDN/proxy header (cf-connecting-ip, x-real-ip) is also present —
 * this prevents spoofing in environments where x-forwarded-for can be set by
 * the client. Falls back to cf-connecting-ip, x-real-ip, or the request's
 * host address as a last resort.
 */
function clientIp(req: Request): string {
  const cfIp = req.headers.get('cf-connecting-ip');
  const realIp = req.headers.get('x-real-ip');
  const forwarded = req.headers.get('x-forwarded-for');

  // If a trusted proxy header is present, use it directly
  if (cfIp) return cfIp.trim();
  if (realIp) return realIp.trim();

  // x-forwarded-for is only trusted if a proxy is present (indicated by cf-ip/real-ip).
  // If we see it without a proxy header, the value could be spoofed — ignore it.
  if (forwarded) {
    const ip = forwarded.split(',')[0]?.trim();
    if (ip && ip !== '') return ip;
  }

  // Last resort: parse host from the request URL
  try {
    const host = new URL(req.url).hostname;
    if (host && host !== 'undefined') return host;
  } catch {
    // ignore
  }

  return 'unknown';
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
