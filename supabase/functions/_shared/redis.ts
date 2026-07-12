import { Redis } from 'npm:@upstash/redis@1';

const SLOT_LOCK_TTL_SECONDS = 600;

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

function slotLockKey(slotId: string): string {
  return `slot-lock:${slotId}`;
}

/** Locks a slot for `userId` for 600s. Returns false if already locked by someone else. */
export async function lockSlot(slotId: string, userId: string): Promise<boolean> {
  const redis = getRedisClient();
  const result = await redis.set(slotLockKey(slotId), userId, {
    nx: true,
    ex: SLOT_LOCK_TTL_SECONDS,
  });
  return result === 'OK';
}

/** Unlocks a slot. Only removes the lock if it's held by `userId`. */
export async function unlockSlot(slotId: string, userId: string): Promise<boolean> {
  const redis = getRedisClient();
  const key = slotLockKey(slotId);
  const lockedBy = await redis.get<string>(key);
  if (lockedBy !== userId) return false;
  await redis.del(key);
  return true;
}

export async function isSlotLocked(slotId: string): Promise<boolean> {
  const redis = getRedisClient();
  return (await redis.exists(slotLockKey(slotId))) === 1;
}
