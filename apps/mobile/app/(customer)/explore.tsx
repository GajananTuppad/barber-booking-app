import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { AppButton } from '../../components/AppButton';
import { BarberCard } from '../../components/BarberCard';
import { BottomSheet } from '../../components/BottomSheet';
import { colors } from '../../constants/theme';
import { useUserLocation } from '../../hooks/useUserLocation';
import { trpc } from '../../lib/trpc';

const DISTANCE_OPTIONS = [5, 10, 25, 50];
const PRICE_OPTIONS: { label: string; max: number | null }[] = [
  { label: 'Any', max: null },
  { label: 'Under ₹300', max: 300 },
  { label: 'Under ₹500', max: 500 },
  { label: 'Under ₹1000', max: 1000 },
];

export default function ExploreScreen() {
  const router = useRouter();
  const { coords } = useUserLocation();
  const [region, setRegion] = useState<Region | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);

  const center = region ? { lat: region.latitude, lng: region.longitude } : coords;

  const nearbyQuery = trpc.barber.getNearby.useQuery(
    { lat: center?.lat ?? 0, lng: center?.lng ?? 0, radiusKm },
    { enabled: Boolean(center) },
  );

  const barbers = useMemo(
    () => (nearbyQuery.data ?? []).filter((barber) => !onlyAvailable || barber.is_available),
    [nearbyQuery.data, onlyAvailable],
  );

  const barbersWithCoords = useMemo(
    () =>
      barbers
        .map((barber) => {
          const lat = barber.salon?.lat;
          const lng = barber.salon?.lng;
          if (lat == null || lng == null) return null;
          return { ...barber, lat, lng };
        })
        .filter((barber): barber is NonNullable<typeof barber> => barber !== null),
    [barbers],
  );

  if (!coords) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-muted">Getting your location…</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: coords.lat,
          longitude: coords.lng,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        onRegionChangeComplete={setRegion}
      >
        {barbersWithCoords.map((barber) => (
          <Marker
            key={barber.id}
            coordinate={{ latitude: barber.lat, longitude: barber.lng }}
            title={barber.profile?.full_name ?? 'Barber'}
            description={barber.salon?.name ?? ''}
            pinColor={colors.gold}
            onPress={() => router.push(`/(customer)/barber/${barber.id}`)}
          />
        ))}
      </MapView>

      <Pressable
        onPress={() => setFiltersVisible(true)}
        className="absolute right-4 top-14 rounded-full border border-gold bg-card px-4 py-2"
      >
        <Text className="text-sm font-medium text-gold">Filters</Text>
      </Pressable>

      <View className="max-h-72 border-t border-border bg-card px-4 pt-3">
        <Text className="mb-2 text-base font-semibold text-white">
          {barbers.length} barber{barbers.length === 1 ? '' : 's'} in view
        </Text>
        <ScrollView>
          {barbers.map((barber) => (
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
        </ScrollView>
      </View>

      <BottomSheet visible={filtersVisible} onClose={() => setFiltersVisible(false)}>
        <Text className="mb-4 text-lg font-semibold text-white">Filters</Text>

        <Text className="mb-2 text-sm text-muted">Distance</Text>
        <View className="mb-4 flex-row gap-2">
          {DISTANCE_OPTIONS.map((km) => (
            <Pressable
              key={km}
              onPress={() => setRadiusKm(km)}
              className={`rounded-full border px-3 py-2 ${radiusKm === km ? 'border-gold bg-gold' : 'border-border bg-input'}`}
            >
              <Text className={`text-sm ${radiusKm === km ? 'text-black' : 'text-white'}`}>{km} km</Text>
            </Pressable>
          ))}
        </View>

        <Text className="mb-2 text-sm text-muted">Price (applied on barber profiles)</Text>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {PRICE_OPTIONS.map((option) => (
            <Pressable
              key={option.label}
              onPress={() => setMaxPrice(option.max)}
              className={`rounded-full border px-3 py-2 ${maxPrice === option.max ? 'border-gold bg-gold' : 'border-border bg-input'}`}
            >
              <Text className={`text-sm ${maxPrice === option.max ? 'text-black' : 'text-white'}`}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => setOnlyAvailable((prev) => !prev)}
          className="mb-4 flex-row items-center justify-between rounded-card border border-border bg-input px-4 py-3"
        >
          <Text className="text-white">Only show available barbers</Text>
          <View className={`h-5 w-5 rounded border ${onlyAvailable ? 'border-gold bg-gold' : 'border-border'}`} />
        </Pressable>

        <AppButton label="Apply Filters" onPress={() => setFiltersVisible(false)} />
      </BottomSheet>
    </View>
  );
}
