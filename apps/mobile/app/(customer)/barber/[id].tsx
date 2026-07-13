import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { AppButton } from '../../../components/AppButton';
import { ServiceItem } from '../../../components/ServiceItem';
import { trpc } from '../../../lib/trpc';

const TABS = ['Services', 'Reviews', 'About'] as const;
type Tab = (typeof TABS)[number];

export default function BarberProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('Services');

  const { data: barber, isLoading } = trpc.barber.getById.useQuery({ barberId: id ?? '' }, { enabled: Boolean(id) });

  if (isLoading || !barber) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-muted">Loading…</Text>
      </View>
    );
  }

  const name = barber.profile?.full_name ?? 'Barber';
  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: barber.reviews.filter((review) => review.rating === star).length,
  }));

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="pb-28">
        <View className="h-40 bg-input" />
        <View className="-mt-10 px-4">
          {barber.avatar_url ? (
            <Image source={{ uri: barber.avatar_url }} className="h-20 w-20 rounded-full border-4 border-bg bg-input" />
          ) : (
            <View className="h-20 w-20 items-center justify-center rounded-full border-4 border-bg bg-input">
              <Text className="text-2xl font-semibold text-gold">{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}

          <Text className="mt-3 text-2xl font-bold text-white">{name}</Text>
          <Text className="text-muted">{barber.salon?.name}</Text>
          <View className="mt-1 flex-row items-center">
            <Text className="text-gold">★ {barber.avgRating?.toFixed(1) ?? 'New'}</Text>
            <Text className="ml-2 text-xs text-muted">({barber.reviewCount} reviews)</Text>
          </View>

          <View className="mt-4 flex-row rounded-card border border-border bg-card">
            {TABS.map((t) => (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                className={`flex-1 items-center py-3 ${tab === t ? 'border-b-2 border-gold' : ''}`}
              >
                <Text className={`text-sm font-medium ${tab === t ? 'text-gold' : 'text-muted'}`}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <View className="mt-4">
            {tab === 'Services' ? (
              barber.services.length === 0 ? (
                <Text className="text-muted">No services listed yet.</Text>
              ) : (
                barber.services.map((service) => (
                  <ServiceItem
                    key={service.id}
                    name={service.name}
                    duration={service.duration_minutes}
                    price={Number(service.price)}
                  />
                ))
              )
            ) : null}

            {tab === 'Reviews' ? (
              <View>
                {ratingBreakdown.map(({ star, count }) => (
                  <View key={star} className="mb-1 flex-row items-center">
                    <Text className="w-8 text-xs text-muted">{star}★</Text>
                    <View className="mx-2 h-2 flex-1 overflow-hidden rounded-full bg-border">
                      <View
                        className="h-2 bg-gold"
                        style={{ width: `${barber.reviewCount ? (count / barber.reviewCount) * 100 : 0}%` }}
                      />
                    </View>
                    <Text className="w-6 text-xs text-muted">{count}</Text>
                  </View>
                ))}

                <View className="mt-4">
                  {barber.reviews.length === 0 ? (
                    <Text className="text-muted">No reviews yet.</Text>
                  ) : (
                    barber.reviews.map((review) => (
                      <View key={review.id} className="mb-3 rounded-card border border-border bg-card p-3">
                        <View className="flex-row items-center justify-between">
                          <Text className="font-semibold text-white">{review.customer?.full_name ?? 'Customer'}</Text>
                          <Text className="text-gold">{'★'.repeat(review.rating)}</Text>
                        </View>
                        {review.comment ? <Text className="mt-1 text-sm text-muted">{review.comment}</Text> : null}
                      </View>
                    ))
                  )}
                </View>
              </View>
            ) : null}

            {tab === 'About' ? (
              <View>
                <Text className="mb-1 text-sm text-muted">Experience</Text>
                <Text className="mb-4 text-white">{barber.experience_years} years</Text>
                <Text className="mb-1 text-sm text-muted">Bio</Text>
                <Text className="mb-4 text-white">{barber.bio ?? 'No bio yet.'}</Text>
                <Text className="mb-1 text-sm text-muted">Address</Text>
                <Text className="text-white">{barber.salon?.address ?? 'Address not available'}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-bg p-4">
        <AppButton label="Book Now" onPress={() => router.push(`/(customer)/book/${barber.id}`)} />
      </View>
    </View>
  );
}
