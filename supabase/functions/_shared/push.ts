const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/** Sends a push message via Expo's push API. Silently no-ops if `to` isn't a valid Expo push token. */
export async function sendExpoPush(message: PushMessage): Promise<void> {
  if (!message.to.startsWith('ExponentPushToken')) {
    console.warn(`Skipping push: "${message.to}" is not an Expo push token`);
    return;
  }

  const response = await fetch(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: message.to,
      title: message.title,
      body: message.body,
      data: message.data ?? {},
      sound: 'default',
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Expo push failed (${response.status}): ${body}`);
  }
}
