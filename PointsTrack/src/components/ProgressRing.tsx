import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  radius?: number;
  stroke?: number;
  progress: number; // 0 to 1
  color?: string;
}

import { useColorScheme } from 'nativewind';

const ProgressRing = ({ radius = 100, stroke = 15, progress, color = '#4F46E5' }: ProgressRingProps) => {
  const { colorScheme } = useColorScheme();
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, { duration: 1000 });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - animatedProgress.value * circumference;
    return {
      strokeDashoffset,
    };
  });

  return (
    <View className="items-center justify-center">
      <Svg height={radius * 2} width={radius * 2} viewBox={`0 0 ${radius * 2} ${radius * 2}`}>
        <Circle
          stroke={colorScheme === 'dark' ? "#334155" : "#E2E8F0"}
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <AnimatedCircle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          rotation="-90"
          origin={`${radius}, ${radius}`}
        />
      </Svg>
      <View className="absolute items-center justify-center">
        <Text className="text-4xl font-pbold text-primary dark:text-white">{(progress * 100).toFixed(0)}%</Text>
      </View>
    </View>
  );
};

export default ProgressRing;
