import { Pressable, Text, View } from 'react-native';

interface ServiceItemProps {
  name: string;
  duration: number;
  price: number;
  selected?: boolean;
  onPress?: () => void;
}

export function ServiceItem({ name, duration, price, selected = false, onPress }: ServiceItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`mb-2 flex-row items-center justify-between rounded-card border p-3 ${
        selected ? 'border-gold bg-gold/10' : 'border-border bg-card'
      }`}
    >
      <View className="flex-row items-center">
        <View
          className={`mr-3 h-5 w-5 items-center justify-center rounded border ${
            selected ? 'border-gold bg-gold' : 'border-border'
          }`}
        >
          {selected ? <Text className="text-xs font-bold text-black">{'✓'}</Text> : null}
        </View>
        <View>
          <Text className="text-base font-medium text-white">{name}</Text>
          <Text className="text-xs text-muted">{duration} min</Text>
        </View>
      </View>
      <Text className={`text-base font-semibold ${selected ? 'text-gold' : 'text-white'}`}>₹{price}</Text>
    </Pressable>
  );
}
