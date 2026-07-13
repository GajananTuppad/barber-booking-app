import { Pressable, Text } from 'react-native';

export type SlotButtonStatus = 'available' | 'locked' | 'booked';

interface SlotButtonProps {
  time: string;
  status: SlotButtonStatus;
  selected?: boolean;
  onPress?: () => void;
}

const statusClasses: Record<SlotButtonStatus, string> = {
  available: 'border-success bg-success/10',
  locked: 'border-warning bg-warning/10',
  booked: 'border-border bg-input',
};

const statusTextClasses: Record<SlotButtonStatus, string> = {
  available: 'text-success',
  locked: 'text-warning',
  booked: 'text-muted',
};

export function SlotButton({ time, status, selected = false, onPress }: SlotButtonProps) {
  const disabled = status !== 'available';

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`m-1 min-w-[76px] items-center rounded-card border px-3 py-2 ${
        selected ? 'border-gold bg-gold/10' : statusClasses[status]
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <Text className={`text-sm font-medium ${selected ? 'text-gold' : statusTextClasses[status]}`}>{time}</Text>
    </Pressable>
  );
}
