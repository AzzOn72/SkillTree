/**
 * SkillGrid — NodeDetailSheet
 *
 * Bottom sheet showing full node detail with:
 *   - Learning resources as text descriptions
 *   - Smart search links (Google, YouTube, Coursera) — always valid URLs
 *   - Prerequisite progress indicator
 *   - Dependent nodes preview ("Unlocks: ...")
 *   - Celebration animation on completion
 */

import React, { useEffect, useCallback, memo, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import type { NodeId, NodeStatus, SkillNode, SkillGraph } from '../../types';
import { Colors, TIER_COLORS, TIER_ICONS, Typography, Radii } from '../../constants/theme';
import { generateSearchLinks } from '../../api/groq';

const SHEET_HEIGHT = 440;

interface NodeDetailSheetProps {
  node: SkillNode | null;
  status: NodeStatus | null;
  graph?: SkillGraph;
  statuses?: Map<NodeId, NodeStatus>;
  onComplete: (id: NodeId) => void;
  onDismiss: () => void;
}

const NodeDetailSheetInner: React.FC<NodeDetailSheetProps> = ({
  node,
  status,
  graph,
  statuses,
  onComplete,
  onDismiss,
}) => {
  const { height: screenH } = useWindowDimensions();

  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const celebrationScale = useSharedValue(0);

  const isVisible = node !== null;

  useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0, { damping: 22, stiffness: 200 });
      backdropOpacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withSpring(SHEET_HEIGHT, { damping: 20, stiffness: 200 });
      backdropOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [isVisible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    pointerEvents: backdropOpacity.value > 0 ? 'auto' : 'none',
  }));

  const celebrationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrationScale.value }],
    opacity: celebrationScale.value > 0 ? 1 : 0,
  }));

  // Swipe-down to dismiss
  const savedTranslateY = useSharedValue(0);
  const swipeGesture = Gesture.Pan()
    .onStart(() => { savedTranslateY.value = translateY.value; })
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 100 || e.velocityY > 600) {
        runOnJS(onDismiss)();
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 180 });
      }
    });

  const handleComplete = useCallback(() => {
    if (!node) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // Celebration burst
    celebrationScale.value = withSequence(
      withSpring(1.2, { damping: 8, stiffness: 300 }),
      withTiming(0, { duration: 600 }),
    );
    onComplete(node.id);
    // Delay dismiss for celebration
    setTimeout(() => onDismiss(), 400);
  }, [node, onComplete, onDismiss]);

  const handleOpenLink = useCallback((url: string) => {
    Linking.openURL(url).catch(console.warn);
  }, []);

  // Compute prerequisite progress
  const prereqInfo = useMemo(() => {
    if (!node || !graph || !statuses) return null;
    const deps = graph.adjacencyIn.get(node.id);
    if (!deps || deps.size === 0) return null;
    const total = deps.size;
    let completed = 0;
    for (const depId of deps) {
      if (statuses.get(depId) === 'completed') completed++;
    }
    return { completed, total };
  }, [node, graph, statuses]);

  // Compute dependent nodes
  const dependents = useMemo(() => {
    if (!node || !graph) return [];
    const out = graph.adjacencyOut.get(node.id);
    if (!out) return [];
    return [...out].map(id => graph.nodeMap.get(id)?.title ?? id).slice(0, 3);
  }, [node, graph]);

  // Search links
  const searchLinks = useMemo(() => {
    if (!node) return [];
    return generateSearchLinks(node.title);
  }, [node]);

  if (!node) return null;

  const tierColor = TIER_COLORS[node.tier];
  const tierIcon = TIER_ICONS[node.tier];

  return (
    <>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      </Animated.View>

      {/* Sheet */}
      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          {/* Drag handle */}
          <View style={styles.handle} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Tier + Title */}
            <View style={styles.header}>
              <View style={[styles.tierPill, { backgroundColor: `${tierColor}18`, borderColor: `${tierColor}44` }]}>
                <Text style={styles.tierIcon}>{tierIcon}</Text>
                <Text style={[styles.tierText, { color: tierColor }]}>
                  {node.tier.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.title}>{node.title}</Text>
            </View>

            {/* Description */}
            <Text style={styles.description}>{node.description}</Text>

            {/* Meta row */}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>XP REWARD</Text>
                <Text style={[styles.metaValue, { color: tierColor }]}>
                  ✦ {node.xpReward}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>DURATION</Text>
                <Text style={styles.metaValue}>{node.estimatedDuration}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>STATUS</Text>
                <Text
                  style={[
                    styles.metaValue,
                    {
                      color:
                        status === 'completed'
                          ? Colors.success
                          : status === 'unlockable'
                          ? tierColor
                          : Colors.textDim,
                    },
                  ]}
                >
                  {status === 'completed' ? '✓ DONE' : status === 'unlockable' ? '▶ READY' : '🔒 LOCKED'}
                </Text>
              </View>
            </View>

            {/* Prerequisite progress */}
            {prereqInfo && (
              <View style={styles.prereqSection}>
                <Text style={styles.sectionLabel}>PREREQUISITES</Text>
                <View style={styles.prereqBar}>
                  <View
                    style={[
                      styles.prereqFill,
                      {
                        flex: prereqInfo.completed / prereqInfo.total,
                        backgroundColor: prereqInfo.completed === prereqInfo.total ? Colors.success : Colors.tierFoundation,
                      },
                    ]}
                  />
                  <View style={{ flex: 1 - prereqInfo.completed / prereqInfo.total }} />
                </View>
                <Text style={styles.prereqText}>
                  {prereqInfo.completed}/{prereqInfo.total} completed
                </Text>
              </View>
            )}

            {/* Learning Resources */}
            {node.learningResources.length > 0 && (
              <View style={styles.resourcesSection}>
                <Text style={styles.sectionLabel}>LEARNING RESOURCES</Text>
                {node.learningResources.map((resource, i) => (
                  <View key={i} style={styles.resourceItem}>
                    <Text style={styles.resourceBullet}>📚</Text>
                    <Text style={styles.resourceText}>{resource}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Search Links — always valid */}
            <View style={styles.searchSection}>
              <Text style={styles.sectionLabel}>FIND RESOURCES</Text>
              <View style={styles.searchRow}>
                {searchLinks.map((link) => (
                  <Pressable
                    key={link.platform}
                    style={styles.searchChip}
                    onPress={() => handleOpenLink(link.url)}
                  >
                    <Text style={styles.searchIcon}>{link.icon}</Text>
                    <Text style={styles.searchText}>{link.platform}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Dependent nodes */}
            {dependents.length > 0 && (
              <View style={styles.dependentsSection}>
                <Text style={styles.sectionLabel}>UNLOCKS</Text>
                <Text style={styles.dependentsText}>
                  {dependents.join(' → ')}
                </Text>
              </View>
            )}

            {/* Tags */}
            {node.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {node.tags.slice(0, 5).map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Actions — fixed at bottom */}
          {status === 'unlockable' && (
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: tierColor }]}
              onPress={handleComplete}
            >
              <Text style={styles.primaryBtnText}>Mark Complete  ✦</Text>
            </Pressable>
          )}

          {/* Celebration burst */}
          <Animated.View style={[styles.celebration, celebrationStyle]}>
            <Text style={styles.celebrationText}>🎉</Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.75)',
    zIndex: 10,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SHEET_HEIGHT,
    backgroundColor: Colors.surfaceRaised,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.glassBorder,
    zIndex: 11,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.glassBorder,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radii.sm,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tierIcon: {
    fontSize: 10,
  },
  tierText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    ...Typography.subheading,
    color: Colors.textPrimary,
    flex: 1,
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    ...Typography.small,
    color: Colors.textDim,
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  metaValue: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  sectionLabel: {
    ...Typography.small,
    color: Colors.textDim,
    letterSpacing: 1,
    marginBottom: 8,
  },
  prereqSection: {
    marginBottom: 14,
  },
  prereqBar: {
    height: 4,
    borderRadius: 2,
    flexDirection: 'row',
    backgroundColor: Colors.xpTrack,
    overflow: 'hidden',
    marginBottom: 4,
  },
  prereqFill: {
    height: 4,
    borderRadius: 2,
  },
  prereqText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  resourcesSection: {
    marginBottom: 14,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  resourceBullet: {
    fontSize: 12,
    marginTop: 1,
  },
  resourceText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  searchSection: {
    marginBottom: 14,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingVertical: 8,
  },
  searchIcon: {
    fontSize: 12,
  },
  searchText: {
    ...Typography.small,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  dependentsSection: {
    marginBottom: 14,
  },
  dependentsText: {
    ...Typography.caption,
    color: Colors.tierFoundation,
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  tagText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  primaryBtn: {
    marginHorizontal: 20,
    marginBottom: 32,
    borderRadius: Radii.lg,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  celebration: {
    position: 'absolute',
    top: -40,
    alignSelf: 'center',
  },
  celebrationText: {
    fontSize: 48,
  },
});

export const NodeDetailSheet = memo(NodeDetailSheetInner, (prev, next) =>
  prev.node?.id === next.node?.id && prev.status === next.status,
);
NodeDetailSheet.displayName = 'NodeDetailSheet';
