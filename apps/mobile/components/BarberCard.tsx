import { Image, Pressable, Text, View } from 'react-native';
import { colors } from '../constants/theme';

interface BarberCardProps {
  avatar?: string | null;
  name: string;
  salonName: string;
  rating: number | null;
  reviewCount: number;
  distanceKm?: number | null;
  priceFrom?: number | null;
  isAvailable?: boolean;
  onPress?: () => void;
}

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <View className="flex-row">
      {Array.from({ length: 5 }).map((_, i) => (
        <Text key={i} style={{ color: i < full ? colors.gold : colors.border, fontSize: 12 }}>
          ★
        </Text>
      ))}
    </View>
  );
}

export function BarberCard({
  avatar,
  name,
  salonName,
  rating,
  reviewCount,
  distanceKm,
  priceFrom,
  isAvailable = true,
  onPress,
}: BarberCardProps) {
  return (
    <Pressable onPress={onPress} className="mb-3 flex-row items-center rounded-card border border-border bg-card p-3">
      {avatar ? (
        <Image source={{ uri: avatar }} className="h-16 w-16 rounded-full bg-input" />
      ) : (
        <View className="h-16 w-16 items-center justify-center rounded-full bg-input">
          <Text className="text-xl font-semibold text-gold">{name.charAt(0).toUpperCase()}</Text>
        </View>
      )}

      <View className="ml-3 flex-1">
        <Text className="text-base font-semibold text-white" numberOfLines={1}>
          {name}
        </Text>
        <Text className="text-sm text-muted" numberOfLines={1}>
          {salonName}
        </Text>
        <View className="mt-1 flex-row items-center">
          <Stars rating={rating ?? 0} />
          <Text className="ml-1 text-xs text-muted">
            {rating ? rating.toFixed(1) : 'New'} ({reviewCount})
          </Text>
        </View>
      </View>

      <View className="items-end">
        {typeof distanceKm === 'number' ? <Text className="text-xs text-muted">{distanceKm.toFixed(1)} km</Text> : null}
        {typeof priceFrom === 'number' ? (
          <Text className="mt-1 text-sm font-semibold text-gold">from ₹{priceFrom}</Text>
        ) : null}
        <View className={`mt-1 rounded-full px-2 py-0.5 ${isAvailable ? 'bg-success/20' : 'bg-border'}`}>
          <Text className={`text-[10px] ${isAvailable ? 'text-success' : 'text-muted'}`}>
            {isAvailable ? 'Available' : 'Unavailable'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
