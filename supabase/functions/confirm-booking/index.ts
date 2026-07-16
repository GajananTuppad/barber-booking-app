import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';
import { sendBookingConfirmation } from '../_shared/notifications.ts';
import { notifyUser } from '../_shared/notify.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';
import { verifyPaymentSignature } from '../_shared/razorpay.ts';
import { unlockSlot } from '../_shared/redis.ts';
import { createAdminClient } from '../_shared/supabase-admin.ts';

interface ConfirmBookingRequest {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
  slotId: string;
  serviceId: string;
  customerId: string;
  barberId: string;
  amount: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  if (!(await checkRateLimit(req, 'confirm-booking', 20, 60))) {
    return errorResponse('Too many requests — please slow down.', 429);
  }

  let body: ConfirmBookingRequest;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const {
    razorpayPaymentId,
    razorpayOrderId,
    razorpaySignature,
    slotId,
    serviceId,
    customerId,
    barberId,
    amount,
  } = body;
  if (
    !razorpayPaymentId ||
    !razorpayOrderId ||
    !razorpaySignature ||
    !slotId ||
    !serviceId ||
    !customerId ||
    !barberId ||
    typeof amount !== 'number'
  ) {
    return errorResponse('Missing required fields', 400);
  }

  const validSignature = await verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!validSignature) {
    return errorResponse('Invalid payment signature', 400);
  }

  const admin = createAdminClient();

  const { data: slot, error: slotError } = await admin.from('slots').select('*').eq('id', slotId).maybeSingle();
  if (slotError) return errorResponse(slotError.message, 500);
  if (!slot) return errorResponse('Slot not found', 404);
  if (slot.status !== 'locked') {
    return errorResponse(`Slot is not in a confirmable state (status: ${slot.status})`, 409);
  }

  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .insert({
      slot_id: slotId,
      service_id: serviceId,
      customer_id: customerId,
      barber_id: barberId,
      status: 'confirmed',
      payment_id: razorpayPaymentId,
      payment_status: 'paid',
      total_amount: amount,
    })
    .select('*')
    .single();
  if (bookingError) return errorResponse(bookingError.message, 500);

  const { error: slotUpdateError } = await admin.from('slots').update({ status: 'booked' }).eq('id', slotId);
  if (slotUpdateError) return errorResponse(slotUpdateError.message, 500);

  await unlockSlot(slotId, customerId);

  try {
    const [{ data: service }, { data: barber }, { data: customerProfile }, authUser] = await Promise.all([
      admin.from('services').select('*').eq('id', serviceId).maybeSingle(),
      admin.from('barbers').select('*').eq('id', barberId).maybeSingle(),
      admin.from('profiles').select('*').eq('id', customerId).maybeSingle(),
      admin.auth.admin.getUserById(customerId),
    ]);

    let barberName = 'your barber';
    let salonName = 'the salon';
    let salonAddress: string | null = null;
    if (barber) {
      const [{ data: barberProfile }, { data: salon }] = await Promise.all([
        admin.from('profiles').select('*').eq('id', barber.profile_id).maybeSingle(),
        admin.from('salons').select('*').eq('id', barber.salon_id).maybeSingle(),
      ]);
      barberName = barberProfile?.full_name ?? barberName;
      salonName = salon?.name ?? salonName;
      salonAddress = salon?.address ?? null;
    }

    await sendBookingConfirmation({
      bookingId: booking.id,
      startTime: slot.start_time,
      serviceName: service?.name ?? 'your appointment',
      barberName,
      salonName,
      salonAddress,
      customerName: customerProfile?.full_name ?? 'there',
      customerEmail: authUser.data.user?.email ?? null,
      customerPhone: customerProfile?.phone ?? null,
    });

    if (barber) {
      await notifyUser({
        userId: barber.profile_id,
        type: 'booking_confirmed',
        title: 'New booking',
        body: `New booking from ${customerProfile?.full_name ?? 'a customer'} for ${service?.name ?? 'a service'}`,
        data: { bookingId: booking.id },
      });
    }
  } catch (err) {
    console.error('Failed to send booking confirmation notification', err);
  }

  return jsonResponse({ bookingId: booking.id, status: 'confirmed' });
});
