import 'server-only';

import { groupBy, indexBy, type BookingRow } from '@barber/shared';
import { createSupabaseAdminClient } from './supabase-admin';

export async function enrichBookingsForAdmin(bookings: BookingRow[]) {
  if (bookings.length === 0) return [];
  const supabase = createSupabaseAdminClient();

  const customerIds = [...new Set(bookings.map((b) => b.customer_id))];
  const barberIds = [...new Set(bookings.map((b) => b.barber_id))];
  const serviceIds = [...new Set(bookings.map((b) => b.service_id))];

  const [{ data: customers }, { data: barbers }, { data: services }] = await Promise.all([
    supabase.from('profiles').select('*').in('id', customerIds),
    supabase.from('barbers').select('*').in('id', barberIds),
    supabase.from('services').select('*').in('id', serviceIds),
  ]);

  const barberProfileIds = [...new Set((barbers ?? []).map((b) => b.profile_id))];
  const { data: barberProfiles } = await supabase.from('profiles').select('*').in('id', barberProfileIds);

  const customersById = indexBy(customers ?? [], (p) => p.id);
  const barbersById = indexBy(barbers ?? [], (b) => b.id);
  const servicesById = indexBy(services ?? [], (s) => s.id);
  const barberProfilesById = indexBy(barberProfiles ?? [], (p) => p.id);

  return bookings.map((booking) => {
    const barber = barbersById.get(booking.barber_id);
    return {
      ...booking,
      customerName: customersById.get(booking.customer_id)?.full_name ?? 'Customer',
      barberName: barber ? (barberProfilesById.get(barber.profile_id)?.full_name ?? 'Barber') : 'Barber',
      serviceName: servicesById.get(booking.service_id)?.name ?? 'Service',
    };
  });
}

export async function getOverviewStats() {
  const supabase = createSupabaseAdminClient();
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    { count: totalBookings },
    { data: paidBookings },
    { count: activeBarbers },
    { count: totalUsers },
    { data: recentBookingsRaw },
    { data: rangeBookings },
  ] = await Promise.all([
    supabase.from('bookings').select('id', { count: 'exact', head: true }),
    supabase.from('bookings').select('total_amount').in('status', ['confirmed', 'completed']),
    supabase.from('barbers').select('id', { count: 'exact', head: true }).eq('is_available', true),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(10),
    supabase.from('bookings').select('created_at, total_amount, status').gte('created_at', since30.toISOString()),
  ]);

  const totalRevenue = (paidBookings ?? []).reduce((sum, b) => sum + Number(b.total_amount), 0);

  const dailyBookingsMap = new Map<string, number>();
  const weeklyRevenueMap = new Map<string, number>();
  for (const row of rangeBookings ?? []) {
    const day = row.created_at.slice(0, 10);
    dailyBookingsMap.set(day, (dailyBookingsMap.get(day) ?? 0) + 1);

    if (row.status === 'confirmed' || row.status === 'completed') {
      const date = new Date(row.created_at);
      const weekStart = new Date(date);
      weekStart.setUTCDate(date.getUTCDate() - date.getUTCDay());
      const weekKey = weekStart.toISOString().slice(0, 10);
      weeklyRevenueMap.set(weekKey, (weeklyRevenueMap.get(weekKey) ?? 0) + Number(row.total_amount));
    }
  }

  const dailyBookings = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(since30.getTime() + i * 24 * 60 * 60 * 1000);
    const day = date.toISOString().slice(0, 10);
    return { day, count: dailyBookingsMap.get(day) ?? 0 };
  });

  const weeklyRevenue = Array.from(weeklyRevenueMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([week, total]) => ({ week, total }));

  const recentBookings = await enrichBookingsForAdmin(recentBookingsRaw ?? []);

  return {
    totalBookings: totalBookings ?? 0,
    totalRevenue,
    activeBarbers: activeBarbers ?? 0,
    totalUsers: totalUsers ?? 0,
    dailyBookings,
    weeklyRevenue,
    recentBookings,
  };
}

export async function getSalonsList() {
  const supabase = createSupabaseAdminClient();
  const { data: salons } = await supabase.from('salons').select('*').order('created_at', { ascending: false });

  const ownerIds = [...new Set((salons ?? []).map((s) => s.owner_id))];
  const [{ data: owners }, { data: barbers }] = await Promise.all([
    supabase.from('profiles').select('*').in('id', ownerIds),
    supabase.from('barbers').select('id, salon_id'),
  ]);

  const ownersById = indexBy(owners ?? [], (p) => p.id);
  const barberCountBySalon = new Map<string, number>();
  for (const barber of barbers ?? []) {
    barberCountBySalon.set(barber.salon_id, (barberCountBySalon.get(barber.salon_id) ?? 0) + 1);
  }

  return (salons ?? []).map((salon) => ({
    ...salon,
    ownerName: ownersById.get(salon.owner_id)?.full_name ?? 'Unknown',
    barberCount: barberCountBySalon.get(salon.id) ?? 0,
  }));
}

export async function getSalonDetail(salonId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: salon } = await supabase.from('salons').select('*').eq('id', salonId).maybeSingle();
  if (!salon) return null;

  const [{ data: owner }, { data: barbersRaw }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', salon.owner_id).maybeSingle(),
    supabase.from('barbers').select('*').eq('salon_id', salonId),
  ]);

  const profileIds = [...new Set((barbersRaw ?? []).map((b) => b.profile_id))];
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', profileIds);
  const profilesById = indexBy(profiles ?? [], (p) => p.id);
  const barbers = (barbersRaw ?? []).map((barber) => ({
    ...barber,
    profile: profilesById.get(barber.profile_id) ?? null,
  }));

  return { salon, owner: owner ?? null, barbers };
}

export async function getBarbersList() {
  const supabase = createSupabaseAdminClient();
  const { data: barbers } = await supabase.from('barbers').select('*').order('created_at', { ascending: false });

  const profileIds = [...new Set((barbers ?? []).map((b) => b.profile_id))];
  const salonIds = [...new Set((barbers ?? []).map((b) => b.salon_id))];
  const barberIds = (barbers ?? []).map((b) => b.id);

  const [{ data: profiles }, { data: salons }, { data: bookings }, { data: reviews }] = await Promise.all([
    supabase.from('profiles').select('*').in('id', profileIds),
    supabase.from('salons').select('*').in('id', salonIds),
    supabase.from('bookings').select('barber_id, total_amount, status').in('barber_id', barberIds),
    supabase.from('reviews').select('barber_id, rating').in('barber_id', barberIds),
  ]);

  const profilesById = indexBy(profiles ?? [], (p) => p.id);
  const salonsById = indexBy(salons ?? [], (s) => s.id);
  const bookingsByBarber = groupBy(bookings ?? [], (b) => b.barber_id);
  const reviewsByBarber = groupBy(reviews ?? [], (r) => r.barber_id);

  return (barbers ?? []).map((barber) => {
    const barberBookings = bookingsByBarber.get(barber.id) ?? [];
    const paidBookings = barberBookings.filter((b) => b.status === 'confirmed' || b.status === 'completed');
    const barberReviews = reviewsByBarber.get(barber.id) ?? [];
    const avgRating = barberReviews.length
      ? barberReviews.reduce((sum, r) => sum + r.rating, 0) / barberReviews.length
      : null;

    return {
      ...barber,
      profile: profilesById.get(barber.profile_id) ?? null,
      salon: salonsById.get(barber.salon_id) ?? null,
      totalBookings: barberBookings.length,
      totalEarnings: paidBookings.reduce((sum, b) => sum + Number(b.total_amount), 0),
      avgRating,
    };
  });
}

export async function getBarberDetail(barberId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: barber } = await supabase.from('barbers').select('*').eq('id', barberId).maybeSingle();
  if (!barber) return null;

  const [{ data: profile }, { data: salon }, { data: services }, { data: reviewsRaw }, { data: bookingsRaw }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', barber.profile_id).maybeSingle(),
      supabase.from('salons').select('*').eq('id', barber.salon_id).maybeSingle(),
      supabase.from('services').select('*').eq('barber_id', barberId),
      supabase.from('reviews').select('*').eq('barber_id', barberId).order('created_at', { ascending: false }),
      supabase.from('bookings').select('*').eq('barber_id', barberId).order('created_at', { ascending: false }),
    ]);

  const reviewerIds = [...new Set((reviewsRaw ?? []).map((r) => r.customer_id))];
  const { data: reviewers } = await supabase.from('profiles').select('*').in('id', reviewerIds);
  const reviewersById = indexBy(reviewers ?? [], (p) => p.id);
  const reviews = (reviewsRaw ?? []).map((review) => ({
    ...review,
    customer: reviewersById.get(review.customer_id) ?? null,
  }));

  const bookings = await enrichBookingsForAdmin(bookingsRaw ?? []);

  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((review) => review.rating === star).length,
  }));

  return {
    barber,
    profile: profile ?? null,
    salon: salon ?? null,
    services: services ?? [],
    reviews,
    ratingBreakdown,
    bookings,
  };
}

export async function getUsersList() {
  const supabase = createSupabaseAdminClient();
  const [{ data: profiles }, authUsersResult] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const authUsersById = indexBy(authUsersResult.data.users, (u) => u.id);
  const customerIds = (profiles ?? []).map((p) => p.id);
  const { data: bookings } = await supabase.from('bookings').select('customer_id').in('customer_id', customerIds);

  const bookingCountByCustomer = new Map<string, number>();
  for (const booking of bookings ?? []) {
    bookingCountByCustomer.set(booking.customer_id, (bookingCountByCustomer.get(booking.customer_id) ?? 0) + 1);
  }

  return (profiles ?? []).map((profile) => {
    const authUser = authUsersById.get(profile.id);
    return {
      ...profile,
      email: authUser?.email ?? null,
      lastActive: authUser?.last_sign_in_at ?? null,
      bookingCount: bookingCountByCustomer.get(profile.id) ?? 0,
    };
  });
}

export async function getPayoutsList() {
  const supabase = createSupabaseAdminClient();
  const { data: payouts } = await supabase.from('payouts').select('*').order('period_start', { ascending: false });

  const barberIds = [...new Set((payouts ?? []).map((p) => p.barber_id))];
  const { data: barbers } = await supabase.from('barbers').select('*').in('id', barberIds);
  const profileIds = [...new Set((barbers ?? []).map((b) => b.profile_id))];
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', profileIds);

  const barbersById = indexBy(barbers ?? [], (b) => b.id);
  const profilesById = indexBy(profiles ?? [], (p) => p.id);

  const platformTotals = (payouts ?? []).reduce(
    (acc, payout) => {
      acc.gross += Number(payout.gross_amount);
      acc.commission += Number(payout.commission_amount);
      acc.net += Number(payout.net_amount);
      return acc;
    },
    { gross: 0, commission: 0, net: 0 },
  );

  const rows = (payouts ?? []).map((payout) => {
    const barber = barbersById.get(payout.barber_id);
    return {
      ...payout,
      barberName: barber ? (profilesById.get(barber.profile_id)?.full_name ?? 'Barber') : 'Barber',
    };
  });

  return { rows, platformTotals };
}
