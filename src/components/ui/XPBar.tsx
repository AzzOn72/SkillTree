/**
 * SkillGrid — XP Progress Bar
 *
 * Premium animated bar showing:
 *   - Earned/total XP with animated spring fill
 *   - Rank badge (Novice → Ascended) based on progress %
 *   - Milestone markers at 25%, 50%, 75%
 */

import React, { useEffect, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Typography, Radii, getRank } from '../../constants/theme';

interface XPBarProps {
  earnedXp: number;
  totalXp: number;
  progressPercent: number;
  completedCount: number;
  totalCount: number;
}

const XPBarInner: React.FC<XPBarProps> = ({
  earnedXp,
  totalXp,
  progressPercent,
  completedCount,
  totalCount,
}) => {
  const fillWidth = useSharedValue(0);
  const rank = getRank(progressPercent);

  useEffect(() => {
    fillWidth.value = withSpring(progressPercent / 100, {
      damping: 18,
      stiffness: 90,
    });
  }, [progressPercent]);

  const fillStyle = useAnimatedStyle(() => ({
    flex: fillWidth.value || 0.001, // prevent zero-flex crash
  }));

  return (
    <View style={styles.container}>
      {/* Top row: rank + XP */}
      <View style={styles.topRow}>
        <View style={styles.rankRow}>
          <Text style={styles.rankIcon}>{rank.icon}</Text>
          <Text style={[styles.rankTitle, { color: rank.color }]}>{rank.title}</Text>
          <Text style={styles.countLabel}>
            · {completedCount}/{totalCount}
          </Text>
        </View>
        <Text style={styles.xpLabel}>
          <Text style={styles.xpEarned}>{earnedXp.toLocaleString()}</Text>
          <Text style={styles.xpTotal}> / {totalXp.toLocaleString()} XP</Text>
        </Text>
      </View>

      {/* Progress track */}
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
        <View style={styles.trackRemainder} />

        {/* Milestone markers */}
        <View style={[styles.milestone, { left: '25%' }]}>
          <View style={[styles.milestoneDot, progressPercent >= 25 && styles.milestoneDotActive]} />
        </View>
        <View style={[styles.milestone, { left: '50%' }]}>
          <View style={[styles.milestoneDot, progressPercent >= 50 && styles.milestoneDotActive]} />
        </View>
        <View style={[styles.milestone, { left: '75%' }]}>
          <View style={[styles.milestoneDot, progressPercent >= 75 && styles.milestoneDotActive]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rankIcon: {
    fontSize: 12,
  },
  rankTitle: {
    ...Typography.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  countLabel: {
    ...Typography.small,
    color: Colors.textDim,
  },
  xpLabel: {},
  xpEarned: {
    ...Typography.caption,
    color: Colors.xpFill,
    fontWeight: '700',
  },
  xpTotal: {
    ...Typography.small,
    color: Colors.textDim,
  },
  track: {
    height: 5,
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: Colors.xpTrack,
    position: 'relative',
  },
  fill: {
    height: 5,
    backgroundColor: Colors.xpFill,
    shadowColor: Colors.xpFill,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.8,
  },
  trackRemainder: {
    flex: 1,
  },
  milestone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  milestoneDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.textDim,
  },
  milestoneDotActive: {
    backgroundColor: Colors.xpFill,
  },
});

export const XPBar = memo(XPBarInner, (prev, next) =>
  prev.progressPercent === next.progressPercent &&
  prev.earnedXp === next.earnedXp,
);
XPBar.displayName = 'XPBar';
