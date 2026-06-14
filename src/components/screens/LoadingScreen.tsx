/**
 * SkillGrid — LoadingScreen
 *
 * Full-screen loading overlay with multi-phase progress animation.
 * Shows rotating loading messages for a premium feel.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, Typography, Radii } from '../../constants/theme';

const LOADING_MESSAGES = [
  '✦ Analyzing career path…',
  '🧠 Mapping skill dependencies…',
  '🔗 Building DAG structure…',
  '⚡ Optimizing layout…',
  '🎨 Applying visual styling…',
];

interface LoadingScreenProps {
  message: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
  const opacity = useSharedValue(0.3);
  const dotScale1 = useSharedValue(0.4);
  const dotScale2 = useSharedValue(0.4);
  const dotScale3 = useSharedValue(0.4);
  const [currentMsg, setCurrentMsg] = useState(0);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 900, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    // Staggered dot animation
    const delay = 200;
    dotScale1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0.4, { duration: 400 }),
      ), -1, false
    );
    setTimeout(() => {
      dotScale2.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.4, { duration: 400 }),
        ), -1, false
      );
    }, delay);
    setTimeout(() => {
      dotScale3.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.4, { duration: 400 }),
        ), -1, false
      );
    }, delay * 2);

    // Cycle through messages
    const interval = setInterval(() => {
      setCurrentMsg(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const dot1Style = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale1.value }],
    opacity: dotScale1.value,
  }));
  const dot2Style = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale2.value }],
    opacity: dotScale2.value,
  }));
  const dot3Style = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale3.value }],
    opacity: dotScale3.value,
  }));

  return (
    <View style={styles.container}>
      {/* Dots */}
      <View style={styles.dotsRow}>
        <Animated.View style={[styles.dot, { backgroundColor: Colors.tierFoundation }, dot1Style]} />
        <Animated.View style={[styles.dot, { backgroundColor: Colors.tierIntermediate }, dot2Style]} />
        <Animated.View style={[styles.dot, { backgroundColor: Colors.tierElite }, dot3Style]} />
      </View>

      {/* Phase message from store */}
      <Animated.Text style={[styles.phaseText, animatedStyle]}>
        {message || 'Loading...'}
      </Animated.Text>

      {/* Rotating fun messages */}
      <Text style={styles.subText}>
        {LOADING_MESSAGES[currentMsg]}
      </Text>

      {/* Footer */}
      <Text style={styles.footer}>Powered by Groq / Llama 3.3</Text>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    gap: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  phaseText: {
    ...Typography.subheading,
    color: Colors.tierFoundation,
    letterSpacing: 0.5,
  },
  subText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    ...Typography.small,
    color: Colors.textDim,
    letterSpacing: 0.5,
  },
});
