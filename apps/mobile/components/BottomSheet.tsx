import { useEffect, type ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

const HIDDEN_OFFSET = 600;

export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const translateY = useSharedValue(HIDDEN_OFFSET);

  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : HIDDEN_OFFSET, { duration: 250 });
  }, [visible, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/60" onPress={onClose} />
        <Animated.View style={sheetStyle} className="rounded-t-3xl border border-t border-border bg-card p-4 pb-8">
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}
