import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';
import { generateSlotsFromSchedule, type WeeklyScheduleEntry } from '../_shared/schedule.ts';
import { createAdminClient, createUserClient, getBearerToken } from '../_shared/supabase-admin.ts';

const DAYS_AHEAD = 30;

interface GenerateAvailabilityRequest {
  barberId: string;
  schedule: WeeklyScheduleEntry[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const accessToken = getBearerToken(req);
  if (!accessToken) return errorResponse('Missing Authorization bearer token', 401);

  let body: GenerateAvailabilityRequest;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }
  if (!body.barberId || !Array.isArray(body.schedule) || body.schedule.length === 0) {
    return errorResponse('barberId and a non-empty schedule are required', 400);
  }

  const userClient = createUserClient(accessToken);
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return errorResponse('Invalid session', 401);

  const admin = createAdminClient();

  const { data: barber, error: barberError } = await admin
    .from('barbers')
    .select('id, profile_id')
    .eq('id', body.barberId)
    .maybeSingle();
  if (barberError) return errorResponse(barberError.message, 500);
  if (!barber) return errorResponse('Barber not found', 404);
  if (barber.profile_id !== userData.user.id) {
    return errorResponse('You do not own this barber profile', 403);
  }

  const now = new Date();
  const rangeEnd = new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);

  const { data: existingSlots, error: existingError } = await admin
    .from('slots')
    .select('start_time')
    .eq('barber_id', body.barberId)
    .gte('start_time', now.toISOString())
    .lt('start_time', rangeEnd.toISOString());
  if (existingError) return errorResponse(existingError.message, 500);

  const datesWithExistingSlots = new Set(
    (existingSlots ?? []).map((row) => new Date(row.start_time).toISOString().slice(0, 10)),
  );

  const generated = generateSlotsFromSchedule(body.schedule, now, DAYS_AHEAD).filter(
    (slot) => !datesWithExistingSlots.has(slot.startTime.toISOString().slice(0, 10)),
  );

  if (generated.length === 0) {
    return jsonResponse({ created: 0 });
  }

  const { error: insertError } = await admin.from('slots').insert(
    generated.map((slot) => ({
      barber_id: body.barberId,
      start_time: slot.startTime.toISOString(),
      end_time: slot.endTime.toISOString(),
      status: 'available',
    })),
  );
  if (insertError) return errorResponse(insertError.message, 500);

  return jsonResponse({ created: generated.length });
});
