import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';
import { sendCancellation } from '../_shared/notifications.ts';
import { createRefund } from '../_shared/razorpay.ts';
import { createAdminClient, createUserClient, getBearerToken } from '../_shared/supabase-admin.ts';

const REFUND_WINDOW_MS = 60 * 60 * 1000;

interface CancelBookingRequest {
  bookingId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const accessToken = getBearerToken(req);
  if (!accessToken) return errorResponse('Missing Authorization bearer token', 401);

  let body: CancelBookingRequest;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }
  if (!body.bookingId) return errorResponse('bookingId is required', 400);

  const userClient = createUserClient(accessToken);
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return errorResponse('Invalid session', 401);

  const admin = createAdminClient();

  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .select('*')
    .eq('id', body.bookingId)
    .maybeSingle();
  if (bookingError) return errorResponse(bookingError.message, 500);
  if (!booking) return errorResponse('Booking not found', 404);
  if (booking.customer_id !== userData.user.id) {
    return errorResponse('You do not own this booking', 403);
  }
  if (booking.status === 'completed') {
    return errorResponse('Cannot cancel a completed booking', 400);
  }

  if (booking.status !== 'cancelled') {
    const { error: updateError } = await admin.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id);
    if (updateError) return errorResponse(updateError.message, 500);

    const { error: slotUpdateError } = await admin
      .from('slots')
      .update({ status: 'available' })
      .eq('id', booking.slot_id);
    if (slotUpdateError) return errorResponse(slotUpdateError.message, 500);
  }

  const withinRefundWindow = Date.now() - new Date(booking.created_at).getTime() <= REFUND_WINDOW_MS;
  let refunded = booking.payment_status === 'refunded';

  if (!refunded && withinRefundWindow && booking.payment_id && booking.payment_status === 'paid') {
    try {
      await createRefund(booking.payment_id);
      await admin.from('bookings').update({ payment_status: 'refunded' }).eq('id', booking.id);
      refunded = true;
    } catch (err) {
      console.error('Razorpay refund failed', err);
    }
  }

  try {
    const [{ data: slot }, { data: service }, { data: barber }, { data: customerProfile }, authUser] =
      await Promise.all([
        admin.from('slots').select('*').eq('id', booking.slot_id).maybeSingle(),
        admin.from('services').select('*').eq('id', booking.service_id).maybeSingle(),
        admin.from('barbers').select('*').eq('id', booking.barber_id).maybeSingle(),
        admin.from('profiles').select('*').eq('id', booking.customer_id).maybeSingle(),
        admin.auth.admin.getUserById(booking.customer_id),
      ]);

    let barberName = 'your barber';
    let salonName = 'the salon';
    if (barber) {
      const [{ data: barberProfile }, { data: salon }] = await Promise.all([
        admin.from('profiles').select('*').eq('id', barber.profile_id).maybeSingle(),
        admin.from('salons').select('*').eq('id', barber.salon_id).maybeSingle(),
      ]);
      barberName = barberProfile?.full_name ?? barberName;
      salonName = salon?.name ?? salonName;
    }

    await sendCancellation(
      {
        bookingId: booking.id,
        startTime: slot?.start_time ?? booking.created_at,
        serviceName: service?.name ?? 'your appointment',
        barberName,
        salonName,
        salonAddress: null,
        customerName: customerProfile?.full_name ?? 'there',
        customerEmail: authUser.data.user?.email ?? null,
        customerPhone: customerProfile?.phone ?? null,
      },
      refunded,
    );
  } catch (err) {
    console.error('Failed to send cancellation notification', err);
  }

  return jsonResponse({ status: 'cancelled', refunded });
});
