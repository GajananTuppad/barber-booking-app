import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

interface BarberPoleProps {
  width?: number;
  height?: number;
}

export function BarberPole({ width = 56, height = 160 }: BarberPoleProps) {
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.value = withRepeat(withTiming(-40, { duration: 900, easing: Easing.linear }), -1, false);
  }, [offset]);

  const stripeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));

  return (
    <View
      style={{
        width,
        height,
        borderRadius: width / 2,
        overflow: 'hidden',
        backgroundColor: '#fff',
        borderWidth: 3,
        borderColor: '#C9A84C',
      }}
    >
      <Animated.View style={[{ width, height: height + 80 }, stripeStyle]}>
        <Svg width={width} height={height + 80}>
          <Defs>
            <Pattern id="stripes" patternUnits="userSpaceOnUse" width={40} height={40} patternTransform="rotate(45)">
              <Rect x="0" y="0" width="20" height="40" fill="#E0524B" />
              <Rect x="20" y="0" width="20" height="40" fill="#2A4FE0" />
            </Pattern>
          </Defs>
          <Rect x="0" y="0" width={width} height={height + 80} fill="url(#stripes)" />
        </Svg>
      </Animated.View>
    </View>
  );
}
