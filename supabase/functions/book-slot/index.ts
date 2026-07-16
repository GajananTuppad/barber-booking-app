import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';
import { createRazorpayOrder } from '../_shared/razorpay.ts';
import { isSlotLocked, lockSlot } from '../_shared/redis.ts';
import { createAdminClient, createUserClient, getBearerToken } from '../_shared/supabase-admin.ts';

interface BookSlotRequest {
  slotId: string;
  serviceId: string;
  customerId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  let body: BookSlotRequest;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }
  const { slotId, serviceId, customerId } = body;
  if (!slotId || !serviceId || !customerId) {
    return errorResponse('slotId, serviceId and customerId are required', 400);
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) return errorResponse('Missing Authorization bearer token', 401);

  const userClient = createUserClient(accessToken);
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return errorResponse('Invalid session', 401);
  if (userData.user.id !== customerId) {
    return errorResponse('customerId does not match the signed-in user', 403);
  }

  const admin = createAdminClient();

  const { data: slot, error: slotError } = await admin
    .from('slots')
    .select('id, status, barber_id')
    .eq('id', slotId)
    .maybeSingle();
  if (slotError) return errorResponse(slotError.message, 500);
  if (!slot) return errorResponse('Slot not found', 404);
  if (slot.status !== 'available') return errorResponse('Slot is not available', 409);

  const { data: service, error: serviceError } = await admin
    .from('services')
    .select('id, price, barber_id')
    .eq('id', serviceId)
    .maybeSingle();
  if (serviceError) return errorResponse(serviceError.message, 500);
  if (!service) return errorResponse('Service not found', 404);
  if (service.barber_id !== slot.barber_id) {
    return errorResponse("Service does not belong to this slot's barber", 400);
  }

  if (await isSlotLocked(slotId)) {
    return errorResponse('Slot is currently locked by another customer', 409);
  }
  const locked = await lockSlot(slotId, customerId);
  if (!locked) {
    return errorResponse('Slot is currently locked by another customer', 409);
  }

  const { error: updateError } = await admin.from('slots').update({ status: 'locked' }).eq('id', slotId);
  if (updateError) return errorResponse(updateError.message, 500);

  const amountPaise = Math.round(Number(service.price) * 100);
  try {
    const order = await createRazorpayOrder(amountPaise, `slot_${slotId}`);
    return jsonResponse({
      orderId: order.id,
      amount: order.amount,
      currency: 'INR',
      keyId: Deno.env.get('RAZORPAY_KEY_ID'),
    });
  } catch (err) {
    // The lock/DB state would otherwise strand this slot if payment setup failed.
    await admin.from('slots').update({ status: 'available' }).eq('id', slotId);
    return errorResponse(err instanceof Error ? err.message : 'Failed to create payment order', 502);
  }
});
