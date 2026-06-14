/**
 * SkillGrid — Home Screen
 *
 * Shows:
 *   1. GoalInput (hero) when no trees or when creating new
 *   2. Tree list with rank icons, progress bars, stats when trees exist
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Pressable, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoalInput } from '../src/components/ui/GoalInput';
import { useSkillGridStore, useTreeList } from '../src/hooks/useSkillTree';
import { Colors, Typography, Radii, getRank } from '../src/constants/theme';
import { LoadingScreen } from '../src/components/screens/LoadingScreen';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showNewGoal, setShowNewGoal] = useState(false);

  const isLoading = useSkillGridStore((s) => s.isLoading);
  const loadingMessage = useSkillGridStore((s) => s.loadingMessage);
  const setActiveTree = useSkillGridStore((s) => s.setActiveTree);
  const deleteTree = useSkillGridStore((s) => s.deleteTree);
  const trees = useSkillGridStore((s) => s.trees);
  const resetTreeProgress = useSkillGridStore((s) => s.resetTreeProgress);

  const treeList = useTreeList();

  // Compute stats for each tree from the live Map
  const treeStats = useMemo(() => {
    const stats = new Map<string, { completed: number; total: number; percent: number; earnedXp: number }>();
    for (const [id, instance] of trees) {
      let completed = 0;
      for (const status of instance.statuses.values()) {
        if (status === 'completed') completed++;
      }
      const total = instance.graph.nodeMap.size;
      stats.set(id, {
        completed,
        total,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0,
        earnedXp: instance.earnedXp,
      });
    }
    return stats;
  }, [trees]);

  // Global stats
  const globalStats = useMemo(() => {
    let totalXp = 0;
    let completedNodes = 0;
    for (const [, instance] of trees) {
      totalXp += instance.earnedXp;
      for (const status of instance.statuses.values()) {
        if (status === 'completed') completedNodes++;
      }
    }
    return { totalXp, completedNodes, treeCount: trees.size };
  }, [trees]);

  const handleGenerated = () => {
    // After generation, the store has the new activeTreeId
    // Navigate via the store's active tree
    const { activeTreeId } = useSkillGridStore.getState();
    if (activeTreeId) {
      setShowNewGoal(false);
      router.push(`/tree/${activeTreeId}`);
    }
  };

  const handleOpenTree = (id: string) => {
    setActiveTree(id);
    router.push(`/tree/${id}`);
  };

  // Loading overlay
  if (isLoading) {
    return <LoadingScreen message={loadingMessage} />;
  }

  // New goal input (hero or "create new" mode)
  if (treeList.length === 0 || showNewGoal) {
    return (
      <View style={styles.container}>
        {showNewGoal && treeList.length > 0 && (
          <Pressable
            style={[styles.topBackBtn, { top: insets.top + 8 }]}
            onPress={() => setShowNewGoal(false)}
          >
            <Text style={styles.topBackBtnText}>← Back</Text>
          </Pressable>
        )}
        <GoalInput onGenerated={handleGenerated} />
      </View>
    );
  }

  // Tree list
  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      {/* Header */}
      <View style={styles.headerSection}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Skill Trees</Text>
            <Text style={styles.headerSubtitle}>
              {globalStats.treeCount} {globalStats.treeCount === 1 ? 'path' : 'paths'}
              {globalStats.completedNodes > 0 ? ` · ${globalStats.completedNodes} skills mastered` : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Global stats */}
      {globalStats.totalXp > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{globalStats.totalXp.toLocaleString()}</Text>
            <Text style={styles.statLabel}>TOTAL XP</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{globalStats.completedNodes}</Text>
            <Text style={styles.statLabel}>SKILLS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{globalStats.treeCount}</Text>
            <Text style={styles.statLabel}>TREES</Text>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {treeList.map((t) => {
          const stats = treeStats.get(t.id);
          const rank = stats ? getRank(stats.percent) : getRank(0);

          return (
            <Pressable
              key={t.id}
              style={styles.card}
              onPress={() => handleOpenTree(t.id)}
            >
              {/* Left accent bar colored by rank */}
              <View style={[styles.cardAccent, { backgroundColor: rank.color }]} />

              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardRankIcon}>{rank.icon}</Text>
                  <View style={styles.cardTitleBlock}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{t.goalTitle}</Text>
                    <Text style={[styles.cardRank, { color: rank.color }]}>{rank.title}</Text>
                  </View>
                  {stats && (
                    <Text style={[styles.cardPercent, { color: rank.color }]}>
                      {stats.percent}%
                    </Text>
                  )}
                </View>

                {/* Progress bar */}
                {stats && (
                  <View style={styles.cardProgressBar}>
                    <View
                      style={[
                        styles.cardProgressFill,
                        {
                          flex: Math.max(stats.percent / 100, 0.01),
                          backgroundColor: rank.color,
                        },
                      ]}
                    />
                    <View style={{ flex: Math.max(1 - stats.percent / 100, 0.01) }} />
                  </View>
                )}

                <View style={styles.cardMeta}>
                  {stats && (
                    <Text style={styles.cardMetaText}>
                      {stats.completed}/{stats.total} nodes · ✦ {stats.earnedXp} XP
                    </Text>
                  )}
                  <Text style={styles.cardDate}>
                    {new Date(t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.cardActions}>
                <Pressable
                  style={styles.cardActionBtn}
                  onPress={() => resetTreeProgress(t.id)}
                  hitSlop={8}
                >
                  <Text style={styles.cardActionBtnText}>↺</Text>
                </Pressable>
                <Pressable
                  style={styles.cardActionBtn}
                  onPress={() => deleteTree(t.id)}
                  hitSlop={8}
                >
                  <Text style={[styles.cardActionBtnText, { color: Colors.error }]}>✕</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        })}

        {/* Spacing for FAB */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* FAB — create new tree */}
      <Pressable style={styles.fab} onPress={() => setShowNewGoal(true)}>
        <Text style={styles.fabText}>✦  New Goal</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBackBtn: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  topBackBtnText: {
    ...Typography.body,
    color: Colors.tierFoundation,
  },
  headerSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    ...Typography.heading,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  headerSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  statsBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.subheading,
    color: Colors.tierFoundation,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    ...Typography.small,
    color: Colors.textDim,
    letterSpacing: 0.8,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.glassBorder,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
  },
  cardAccent: {
    width: 3,
  },
  cardContent: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardRankIcon: {
    fontSize: 22,
  },
  cardTitleBlock: {
    flex: 1,
  },
  cardTitle: {
    ...Typography.subheading,
    color: Colors.textPrimary,
    marginBottom: 1,
  },
  cardRank: {
    ...Typography.small,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cardPercent: {
    ...Typography.heading,
    fontSize: 18,
    fontWeight: '800',
  },
  cardProgressBar: {
    height: 3,
    borderRadius: 2,
    flexDirection: 'row',
    backgroundColor: Colors.xpTrack,
    overflow: 'hidden',
  },
  cardProgressFill: {
    height: 3,
    borderRadius: 2,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMetaText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  cardDate: {
    ...Typography.small,
    color: Colors.textDim,
  },
  cardActions: {
    flexDirection: 'column',
    borderLeftWidth: 1,
    borderColor: Colors.glassBorder,
  },
  cardActionBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  cardActionBtnText: {
    fontSize: 16,
    color: Colors.textDim,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    backgroundColor: Colors.tierFoundation,
    borderRadius: Radii.full,
    paddingHorizontal: 28,
    paddingVertical: 14,
    shadowColor: Colors.tierFoundation,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 24,
    shadowOpacity: 0.55,
    elevation: 8,
  },
  fabText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
