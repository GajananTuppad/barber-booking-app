import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface AppButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-2',
  md: 'px-4 py-3',
  lg: 'px-6 py-4',
};

const textSizeClasses: Record<Size, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

const variantClasses: Record<Variant, string> = {
  primary: 'bg-gold',
  secondary: 'bg-transparent border border-gold',
  ghost: 'bg-transparent',
};

const variantTextClasses: Record<Variant, string> = {
  primary: 'text-black',
  secondary: 'text-gold',
  ghost: 'text-gold',
};

export function AppButton({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  ...pressableProps
}: AppButtonProps & { className?: string }) {
  const isDisabled = Boolean(disabled) || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      className={`flex-row items-center justify-center rounded-card ${sizeClasses[size]} ${variantClasses[variant]} ${isDisabled ? 'opacity-50' : ''} ${className ?? ''}`}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#000000' : '#C9A84C'} />
      ) : (
        <Text className={`font-semibold ${textSizeClasses[size]} ${variantTextClasses[variant]}`}>{label}</Text>
      )}
    </Pressable>
  );
}
