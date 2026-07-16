import type { AppRouter } from '@barber/shared';
import type { inferRouterOutputs } from '@trpc/server';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { BarberCard } from '../../components/BarberCard';
import { colors } from '../../constants/theme';
import { useUserLocation } from '../../hooks/useUserLocation';
import { trpc } from '../../lib/trpc';

const CATEGORIES = ['All', 'Hair', 'Beard', 'Color', 'Spa'];

type RouterOutputs = inferRouterOutputs<AppRouter>;
type NearbyBarber = RouterOutputs['barber']['getNearby'][number];
type AllBarber = RouterOutputs['barber']['getAll'][number];

function matchesFilters(
  barber: { profile: { full_name: string | null } | null; salon: { name: string } | null; bio: string | null },
  search: string,
  category: string,
): boolean {
  const haystack = `${barber.profile?.full_name ?? ''} ${barber.salon?.name ?? ''} ${barber.bio ?? ''}`.toLowerCase();
  const matchesSearch = search.trim() === '' || haystack.includes(search.trim().toLowerCase());
  const matchesCategory = category === 'All' || haystack.includes(category.toLowerCase());
  return matchesSearch && matchesCategory;
}

export default function HomeScreen() {
  const router = useRouter();
  const { coords } = useUserLocation();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const nearbyQuery = trpc.barber.getNearby.useQuery(
    { lat: coords?.lat ?? 0, lng: coords?.lng ?? 0, radiusKm: 15 },
    { enabled: Boolean(coords) },
  );
  const allQuery = trpc.barber.getAll.useQuery();

  const nearby = useMemo<NearbyBarber[]>(
    () => (nearbyQuery.data ?? []).filter((barber) => matchesFilters(barber, search, category)),
    [nearbyQuery.data, search, category],
  );

  const topRated = useMemo<AllBarber[]>(
    () =>
      (allQuery.data ?? [])
        .filter((barber) => matchesFilters(barber, search, category))
        .slice()
        .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0)),
    [allQuery.data, search, category],
  );

  const refreshing = nearbyQuery.isRefetching || allQuery.isRefetching;
  function handleRefresh() {
    nearbyQuery.refetch();
    allQuery.refetch();
  }

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="px-4 pb-8 pt-16"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.gold} />}
    >
      <Text className="mb-4 text-2xl font-bold text-white">Find your barber</Text>

      <TextInput
        placeholder="Search by name or service"
        placeholderTextColor={colors.textMuted}
        value={search}
        onChangeText={setSearch}
        className="mb-4 rounded-card border border-border bg-input px-4 py-3 text-white"
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 -mx-1">
        {CATEGORIES.map((item) => {
          const selected = category === item;
          return (
            <Pressable
              key={item}
              onPress={() => setCategory(item)}
              className={`mx-1 rounded-full border px-4 py-2 ${selected ? 'border-gold bg-gold' : 'border-border bg-card'}`}
            >
              <Text className={`text-sm font-medium ${selected ? 'text-black' : 'text-white'}`}>{item}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text className="mb-3 text-lg font-semibold text-white">Near You</Text>
      {nearbyQuery.isLoading ? (
        <Text className="mb-6 text-muted">Finding barbers near you…</Text>
      ) : nearby.length === 0 ? (
        <Text className="mb-6 text-muted">No barbers found nearby.</Text>
      ) : (
        <View className="mb-2">
          {nearby.map((barber) => (
            <BarberCard
              key={barber.id}
              avatar={barber.avatar_url}
              name={barber.profile?.full_name ?? 'Barber'}
              salonName={barber.salon?.name ?? ''}
              rating={null}
              reviewCount={0}
              distanceKm={barber.distanceKm}
              isAvailable={barber.is_available}
              onPress={() => router.push(`/(customer)/barber/${barber.id}`)}
            />
          ))}
        </View>
      )}

      <Text className="mb-3 mt-2 text-lg font-semibold text-white">Top Rated</Text>
      {allQuery.isLoading ? (
        <Text className="text-muted">Loading barbers…</Text>
      ) : topRated.length === 0 ? (
        <Text className="text-muted">No barbers found.</Text>
      ) : (
        topRated.map((barber) => (
          <BarberCard
            key={barber.id}
            avatar={barber.avatar_url}
            name={barber.profile?.full_name ?? 'Barber'}
            salonName={barber.salon?.name ?? ''}
            rating={barber.avgRating}
            reviewCount={barber.reviewCount}
            isAvailable={barber.is_available}
            onPress={() => router.push(`/(customer)/barber/${barber.id}`)}
          />
        ))
      )}
    </ScrollView>
  );
}
