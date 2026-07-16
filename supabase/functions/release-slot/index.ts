import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';
import { unlockSlot } from '../_shared/redis.ts';
import { createAdminClient, createUserClient, getBearerToken } from '../_shared/supabase-admin.ts';

interface ReleaseSlotRequest {
  slotId: string;
}

/** Called by the mobile app when a Razorpay checkout fails or is cancelled after book-slot locked the slot. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  if (!(await checkRateLimit(req, 'release-slot', 20, 60))) {
    return errorResponse('Too many requests — please slow down.', 429);
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) return errorResponse('Missing Authorization bearer token', 401);

  let body: ReleaseSlotRequest;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }
  if (!body.slotId) return errorResponse('slotId is required', 400);

  const userClient = createUserClient(accessToken);
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return errorResponse('Invalid session', 401);

  const admin = createAdminClient();

  const { data: slot, error: slotError } = await admin.from('slots').select('*').eq('id', body.slotId).maybeSingle();
  if (slotError) return errorResponse(slotError.message, 500);
  if (!slot) return errorResponse('Slot not found', 404);

  // Only release a slot that's actually still locked — never touch one
  // that's already booked (confirm-booking beat us to it) or one that
  // already expired back to available on its own.
  if (slot.status === 'locked') {
    const { error: updateError } = await admin.from('slots').update({ status: 'available' }).eq('id', slot.id);
    if (updateError) return errorResponse(updateError.message, 500);
  }

  await unlockSlot(slot.id, userData.user.id);

  return jsonResponse({ status: 'released' });
});
