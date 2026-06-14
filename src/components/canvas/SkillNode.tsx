/**
 * SkillGrid — SkillNode Component
 *
 * Renders a single node card on the infinite canvas with cyberpunk styling.
 *
 * Performance contract:
 *   - Wrapped in React.memo with custom comparator
 *   - Only re-renders on status changes
 *   - Pan/zoom transforms applied to parent canvas container
 *
 * Animation:
 *   - locked:     dim card, no glow, opacity 0.3
 *   - unlockable: continuous glow pulse
 *   - completed:  flash then steady bright
 */

import React, { memo, useEffect, useCallback } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { NodeId, NodeStatus, SkillNode as SkillNodeType } from '../../types';
import { CANVAS_CONSTRAINTS } from '../../types';
import { Colors, TIER_COLORS, TIER_ICONS, Typography, Timing, Radii } from '../../constants/theme';

const { NODE_WIDTH, NODE_HEIGHT } = CANVAS_CONSTRAINTS;

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface SkillNodeProps {
  node: SkillNodeType;
  status: NodeStatus;
  x: number;
  y: number;
  onPress: (id: NodeId) => void;
  onLongPress: (id: NodeId) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const SkillNodeInner: React.FC<SkillNodeProps> = ({
  node,
  status,
  x,
  y,
  onPress,
  onLongPress,
}) => {
  const tierColor = TIER_COLORS[node.tier];
  const tierIcon = TIER_ICONS[node.tier];

  // ── Reanimated shared values ──────────────────────────────────────────────
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(1);
  const cardOpacity = useSharedValue(status === 'locked' ? 0.3 : 1);
  const cardScale = useSharedValue(1);

  // ── Status-driven animation ───────────────────────────────────────────────
  useEffect(() => {
    cancelAnimation(glowOpacity);
    cancelAnimation(glowScale);
    cancelAnimation(cardOpacity);

    if (status === 'locked') {
      glowOpacity.value = withTiming(0, { duration: 300 });
      cardOpacity.value = withTiming(0.30, { duration: 300 });
    } else if (status === 'unlockable') {
      cardOpacity.value = withTiming(0.95, { duration: 400 });
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(1.0, { duration: Timing.glowPulse, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.35, { duration: Timing.glowPulse, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: Timing.glowPulse, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.98, { duration: Timing.glowPulse, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    } else if (status === 'completed') {
      glowOpacity.value = withTiming(0.85, { duration: 200 });
      glowScale.value = withTiming(1.0, { duration: 200 });
      cardOpacity.value = withTiming(1.0, { duration: 200 });
      cardScale.value = withSequence(
        withTiming(1.08, { duration: 120, easing: Easing.out(Easing.quad) }),
        withSpring(1.0, { damping: 12, stiffness: 200 }),
      );
    }
  }, [status]);

  // ── Animated styles ───────────────────────────────────────────────────────
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  // ── Event handlers ────────────────────────────────────────────────────────
  const handlePress = useCallback(() => {
    if (status === 'unlockable') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress(node.id);
    } else if (status === 'completed') {
      Haptics.selectionAsync();
      onLongPress(node.id);
    }
    // Locked: no haptic, no action — intentionally silent
  }, [status, node.id, onPress, onLongPress]);

  const handleLongPress = useCallback(() => {
    if (status !== 'locked') {
      Haptics.selectionAsync();
      onLongPress(node.id);
    }
  }, [status, node.id, onLongPress]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View
      style={[
        styles.root,
        { left: x, top: y, width: NODE_WIDTH, height: NODE_HEIGHT },
      ]}
    >
      {/* Outer glow ring */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            borderColor: tierColor,
            shadowColor: tierColor,
            width: NODE_WIDTH + 14,
            height: NODE_HEIGHT + 14,
            borderRadius: Radii.lg + 4,
            left: -7,
            top: -7,
          },
          glowStyle,
        ]}
      />

      {/* Card body */}
      <Animated.View style={[cardStyle, { flex: 1 }]}>
        <Pressable
          style={[
            styles.card,
            {
              borderColor:
                status === 'completed'
                  ? tierColor
                  : status === 'unlockable'
                  ? `${tierColor}66`
                  : Colors.glassBorder,
              backgroundColor:
                status === 'completed'
                  ? Colors.nodeCompleted
                  : status === 'unlockable'
                  ? Colors.nodeUnlockable
                  : Colors.nodeLocked,
            },
          ]}
          onPress={handlePress}
          onLongPress={handleLongPress}
          android_ripple={status !== 'locked' ? { color: `${tierColor}33`, borderless: false } : undefined}
        >
          {/* Tier badge */}
          <View style={[styles.tierBadge, { backgroundColor: `${tierColor}15` }]}>
            <Text style={styles.tierIcon}>{tierIcon}</Text>
            <Text style={[styles.tierText, { color: tierColor }]}>
              {node.tier.toUpperCase()}
            </Text>
          </View>

          {/* Node title */}
          <Text
            style={[
              styles.titleText,
              {
                color: status === 'locked' ? Colors.textDim : Colors.textPrimary,
              },
            ]}
            numberOfLines={2}
          >
            {node.title}
          </Text>

          {/* XP reward row */}
          <View style={styles.xpRow}>
            <Text
              style={[
                styles.xpText,
                { color: status === 'locked' ? Colors.textDim : tierColor },
              ]}
            >
              ✦ {node.xpReward} XP
            </Text>
            {status === 'completed' && (
              <Text style={styles.checkmark}>✓</Text>
            )}
            {status === 'unlockable' && (
              <View style={[styles.readyDot, { backgroundColor: tierColor }]} />
            )}
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
  },
  glowRing: {
    position: 'absolute',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    shadowOpacity: 1,
    elevation: 6,
  },
  card: {
    flex: 1,
    borderRadius: Radii.lg,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginBottom: 4,
  },
  tierIcon: {
    fontSize: 8,
  },
  tierText: {
    ...Typography.nodeTier,
  },
  titleText: {
    ...Typography.nodeTitle,
    flex: 1,
    lineHeight: 15,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  xpText: {
    ...Typography.nodeXp,
  },
  checkmark: {
    color: Colors.success,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 'auto',
  },
  readyDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginLeft: 'auto',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Memoization
// ─────────────────────────────────────────────────────────────────────────────

export const SkillNode = memo(SkillNodeInner, (prev, next) => {
  return prev.status === next.status && prev.node.id === next.node.id;
});

SkillNode.displayName = 'SkillNode';
