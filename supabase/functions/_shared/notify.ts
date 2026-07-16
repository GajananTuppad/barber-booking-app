import { sendExpoPush } from './push.ts';
import { createAdminClient } from './supabase-admin.ts';

interface NotifyOptions {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/** Writes an in-app notification row (for the bell/list) and best-effort sends an Expo push. */
export async function notifyUser(options: NotifyOptions): Promise<void> {
  const admin = createAdminClient();

  const { error: insertError } = await admin.from('notifications').insert({
    user_id: options.userId,
    type: options.type,
    title: options.title,
    body: options.body,
    data: options.data ?? null,
  });
  if (insertError) console.error('Failed to insert notification row', insertError);

  const { data: profile } = await admin.from('profiles').select('push_token').eq('id', options.userId).maybeSingle();
  if (profile?.push_token) {
    try {
      await sendExpoPush({ to: profile.push_token, title: options.title, body: options.body, data: options.data });
    } catch (err) {
      console.error('Failed to send push notification', err);
    }
  }
}
