import React, { useEffect, useState } from 'react';
import { StyleSheet, ViewStyle, LayoutChangeEvent } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  runOnJS,
  withSpring
} from 'react-native-reanimated';

interface DraggableOverlayProps {
  children: React.ReactNode;
  initialX?: number;
  initialY?: number;
  containerWidth: number;
  containerHeight: number;
  onDragEnd: (x: number, y: number) => void; 
  isEnabled?: boolean;
  style?: ViewStyle;
}

export const DraggableOverlay = ({ 
  children, 
  initialX = 0, 
  initialY = 0, 
  containerWidth,
  containerHeight,
  onDragEnd,
  isEnabled = true,
  style 
}: DraggableOverlayProps) => {
  const translateX = useSharedValue(initialX);
  const translateY = useSharedValue(initialY);
  const context = useSharedValue({ x: 0, y: 0 });

  // We need to know the sticker's own size to calculate boundaries
  const [elementSize, setElementSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    translateX.value = initialX;
    translateY.value = initialY;
  }, [initialX, initialY]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setElementSize({ width, height });
  };

  const gesture = Gesture.Pan()
    .enabled(isEnabled)
    .onStart(() => {
      context.value = { x: translateX.value, y: translateY.value };
    })
    .onUpdate((event) => {
      let newX = event.translationX + context.value.x;
      let newY = event.translationY + context.value.y;

      // --- CLAMPING LOGIC (The Magic Fix) ---
      // Prevent going left/top beyond 0
      if (newX < 0) newX = 0;
      if (newY < 0) newY = 0;

      // Prevent going right/bottom beyond container
      if (elementSize.width > 0 && containerWidth > 0) {
        const maxX = containerWidth - elementSize.width;
        if (newX > maxX) newX = maxX;
      }
      if (elementSize.height > 0 && containerHeight > 0) {
        const maxY = containerHeight - elementSize.height;
        if (newY > maxY) newY = maxY;
      }

      translateX.value = newX;
      translateY.value = newY;
    })
    .onEnd(() => {
      runOnJS(onDragEnd)(translateX.value, translateY.value);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value }
    ],
    position: 'absolute',
    zIndex: 100, 
  }));

  return (
    <GestureDetector gesture={gesture}>
      {/* onLayout captures the size of the sticker itself */}
      <Animated.View onLayout={onLayout} style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};