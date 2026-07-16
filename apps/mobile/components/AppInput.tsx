import { useEffect, useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors } from '../constants/theme';

interface AppInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function AppInput({ label, error, value, onFocus, onBlur, ...inputProps }: AppInputProps) {
  const [focused, setFocused] = useState(false);
  const floated = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    floated.value = withTiming(focused || Boolean(value) ? 1 : 0, { duration: 150 });
  }, [focused, value, floated]);

  const labelStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(floated.value, [0, 1], [0, -20]) },
      { scale: interpolate(floated.value, [0, 1], [1, 0.82]) },
    ],
  }));

  return (
    <View className="mb-4">
      <View
        className={`rounded-card border bg-input px-4 pb-2 pt-5 ${
          error ? 'border-danger' : focused ? 'border-gold' : 'border-border'
        }`}
      >
        <Animated.Text
          style={labelStyle}
          className={`absolute left-4 top-4 origin-left ${error ? 'text-danger' : 'text-muted'}`}
        >
          {label}
        </Animated.Text>
        <TextInput
          {...inputProps}
          value={value}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={colors.textMuted}
          className="text-base text-white"
        />
      </View>
      {error ? <Text className="mt-1 text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
