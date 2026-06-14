/**
 * SkillGrid — Active Tree Screen
 *
 * Wraps the SkillCanvas with the safe area and renders UI overlays (XP bar,
 * Detail Sheet, Back button).
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkillCanvas } from '../../src/components/canvas/SkillCanvas';
import { XPBar } from '../../src/components/ui/XPBar';
import { NodeDetailSheet } from '../../src/components/ui/NodeDetailSheet';
import { useActiveTree, useProgressStats, useSkillGridStore } from '../../src/hooks/useSkillTree';
import { Colors, Typography } from '../../src/constants/theme';
import type { NodeId } from '../../src/types';

export default function TreeScreen() {
  const router = useRouter();
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const insets = useSafeAreaInsets();

  // Set active tree from the route param
  React.useEffect(() => {
    if (goalId) {
      useSkillGridStore.getState().setActiveTree(goalId);
    }
  }, [goalId]);

  const tree = useActiveTree();
  const stats = useProgressStats();

  const selectedNodeId = useSkillGridStore((s) => s.selectedNodeId);
  const selectNode = useSkillGridStore((s) => s.selectNode);
  const completeNode = useSkillGridStore((s) => s.completeNode);
  const setActiveTree = useSkillGridStore((s) => s.setActiveTree);

  const handleBack = useCallback(() => {
    setActiveTree(null);
    router.replace('/');
  }, [setActiveTree, router]);

  const handleNodePress = useCallback((id: NodeId) => {
    selectNode(id);
  }, [selectNode]);

  const handleCompleteNode = useCallback((id: NodeId) => {
    completeNode(id);
  }, [completeNode]);

  const handleDismissSheet = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  if (!tree || !stats) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Pressable style={styles.backBtn} onPress={handleBack}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🌐</Text>
          <Text style={styles.emptyText}>Tree not found or loading...</Text>
        </View>
      </View>
    );
  }

  const selectedNode = selectedNodeId ? tree.graph.nodeMap.get(selectedNodeId) ?? null : null;
  const selectedStatus = selectedNodeId ? tree.statuses.get(selectedNodeId) ?? null : null;

  return (
    <View style={styles.container}>
      {/* Absolute Header Overlay */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={handleBack}>
            <Text style={styles.backBtnText}>← Trees</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {tree.graph.goalTitle}
          </Text>
          <View style={styles.statsChip}>
            <Text style={styles.statsChipText}>
              {stats.completedCount}/{stats.totalCount}
            </Text>
          </View>
        </View>
        <XPBar {...stats} />
      </View>

      {/* Infinite Canvas */}
      <SkillCanvas
        graph={tree.graph}
        layout={tree.layout}
        statuses={tree.statuses}
        onNodePress={handleNodePress}
        onNodeLongPress={handleNodePress}
      />

      {/* Detail Sheet Overlay */}
      <NodeDetailSheet
        node={selectedNode}
        status={selectedStatus}
        graph={tree.graph}
        statuses={tree.statuses}
        onComplete={handleCompleteNode}
        onDismiss={handleDismissSheet}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(10, 10, 10, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    paddingVertical: 6,
    paddingRight: 12,
  },
  backBtnText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.tierFoundation,
  },
  title: {
    ...Typography.subheading,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  statsChip: {
    backgroundColor: `${Colors.tierFoundation}18`,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: `${Colors.tierFoundation}33`,
  },
  statsChipText: {
    ...Typography.caption,
    color: Colors.tierFoundation,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    color: Colors.textDim,
    ...Typography.body,
    textAlign: 'center',
  },
});
