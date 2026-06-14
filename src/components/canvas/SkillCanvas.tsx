/**
 * SkillGrid — SkillCanvas Component (Redesigned & Enhanced)
 *
 * The infinite 2D pan/zoom canvas that renders the full DAG.
 *
 * Performance design:
 *   - Viewport culling: Only render nodes/edges that are visible
 *   - Pan/zoom: ONLY the Animated.View transform changes. Neither SkillNode
 *     nor SkillEdge re-renders during gesture handling.
 *   - Gesture composition: Gesture.Simultaneous(pan, pinch) allows both
 *     gestures to fire concurrently.
 *   - Scale anchor: The pinch gesture anchors to the gesture focal point.
 *   - Node callbacks: stable useCallback refs passed down.
 *   - Inertial scrolling: Smooth decay after pan.
 *   - Pan/drag boundary limits: Prevent users from getting lost.
 *   - Zoom level indicators.
 */

import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions, Pressable, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  clamp,
  withDecay,
  withSpring,
} from 'react-native-reanimated';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import Svg, { Line as SvgLine } from 'react-native-svg';
import { SkillNode } from './SkillNode';
import { SkillEdge } from './SkillEdge';
import { Colors, Typography, Radii } from '../../constants/theme';
import { CANVAS_CONSTRAINTS } from '../../types';
import type { NodeId, NodeStatus, LayoutResult, SkillGraph } from '../../types';

const { MIN_SCALE, MAX_SCALE, NODE_WIDTH, NODE_HEIGHT } = CANVAS_CONSTRAINTS;

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface SkillCanvasProps {
  graph: SkillGraph;
  layout: LayoutResult;
  statuses: Map<NodeId, NodeStatus>;
  onNodePress: (id: NodeId) => void;
  onNodeLongPress: (id: NodeId) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const SkillCanvas: React.FC<SkillCanvasProps> = ({
  graph,
  layout,
  statuses,
  onNodePress,
  onNodeLongPress,
}) => {
  const { width: screenW, height: screenH } = useWindowDimensions();

  const { canvasWidth, canvasHeight } = layout;
  
  // ── Canvas origin offset: center the graph on screen ──────────────────────
  const initialOffsetX = screenW / 2 - (canvasWidth / 2) * 0.65;
  const initialOffsetY = 140; // Leave room for XP bar + header

  // ── Reanimated shared values ──────────────────────────────────────────────
  const translateX = useSharedValue(initialOffsetX);
  const translateY = useSharedValue(initialOffsetY);
  const scale = useSharedValue(0.65);

  const savedTranslateX = useSharedValue(initialOffsetX);
  const savedTranslateY = useSharedValue(initialOffsetY);
  const savedScale = useSharedValue(0.65);
  const lastScale = useSharedValue(1);

  // ── Boundary calculation function ──────────────────────────────────────────────────
  const clampTranslation = (x: number, y: number, s: number) => {
    'worklet';
    // Min X: don't let canvas right edge move past viewport left edge
    const minX = screenW - (canvasWidth + 100) * s;
    // Max X: don't let canvas left edge move past viewport right edge
    const maxX = 100 * s;
    // Min Y: don't let canvas bottom edge move past viewport top edge
    const minY = screenH - (canvasHeight + 100) * s;
    // Max Y: don't let canvas top edge move past viewport bottom edge
    const maxY = 140 * s;

    return {
      x: clamp(x, minX, maxX),
      y: clamp(y, minY, maxY),
    };
  };

  // ── Pan Gesture (with inertia and boundary limits) ────────────────────
  const panGesture = Gesture.Pan()
    .onChange((e) => {
      let newX = savedTranslateX.value + e.translationX;
      let newY = savedTranslateY.value + e.translationY;
      const clamped = clampTranslation(newX, newY, scale.value);
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd((e) => {
      // Natural native-feeling decay momentum
      translateX.value = withDecay({
        velocity: e.velocityX,
        deceleration: 0.995,
      });
      translateY.value = withDecay({
        velocity: e.velocityY,
        deceleration: 0.995,
      });
      
      // Then clamp after decay
      setTimeout(() => {
        const clamped = clampTranslation(translateX.value, translateY.value, scale.value);
        translateX.value = withSpring(clamped.x, { damping: 20, stiffness: 200 });
        translateY.value = withSpring(clamped.y, { damping: 20, stiffness: 200 });
        savedTranslateX.value = clamped.x;
        savedTranslateY.value = clamped.y;
      }, 50);
    });

  // ── Pinch Gesture (improved pivot + boundary limits) ─────────────────────────
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      lastScale.value = 1;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      const scaleDelta = e.scale / lastScale.value;
      const newScale = clamp(savedScale.value * scaleDelta, MIN_SCALE, MAX_SCALE);
      const actualScaleDelta = newScale / savedScale.value;

      // Calculate around focal point
      let newX = e.focalX - actualScaleDelta * (e.focalX - savedTranslateX.value);
      let newY = e.focalY - actualScaleDelta * (e.focalY - savedTranslateY.value);

      // Apply boundaries
      const clamped = clampTranslation(newX, newY, newScale);
      
      translateX.value = clamped.x;
      translateY.value = clamped.y;
      scale.value = newScale;
      lastScale.value = e.scale;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      savedScale.value = scale.value;
    });

  // ── Composed gesture ──────────────────────────────────────────────────────
  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // ── Animated canvas transform ─────────────────────────────────────────────────────
  const canvasAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // ── Zoom level indicator text ──────────────────────────────────────────────────
  const zoomPercent = Math.round((scale.value || 0.65) * 100);

  // ── Stable callback refs ──────────────────────────────────────────────────
  const handleNodePress = useCallback(
    (id: NodeId) => onNodePress(id),
    [onNodePress],
  );
  const handleNodeLongPress = useCallback(
    (id: NodeId) => onNodeLongPress(id),
    [onNodeLongPress],
  );

  // ── Viewport Culling Logic ────────────────────────────────────────────────
  const visibleNodeLayouts = useMemo(() => {
    const padding = 200;
    const currentScale = scale.value || 0.65;
    const currentX = translateX.value || initialOffsetX;
    const currentY = translateY.value || initialOffsetY;
    
    const visibleLeft = (-currentX - padding) / currentScale;
    const visibleTop = (-currentY - padding) / currentScale;
    const visibleRight = (-currentX + screenW + padding) / currentScale;
    const visibleBottom = (-currentY + screenH + padding) / currentScale;

    return [...layout.nodeLayouts.values()].filter((nl) => {
      const nodeRight = nl.position.x + NODE_WIDTH;
      const nodeBottom = nl.position.y + NODE_HEIGHT;
      return (
        nl.position.x < visibleRight &&
        nodeRight > visibleLeft &&
        nl.position.y < visibleBottom &&
        nodeBottom > visibleTop
      );
    });
  }, [layout.nodeLayouts, translateX.value, translateY.value, scale.value, screenW, screenH, initialOffsetX, initialOffsetY]);

  // ── Visible Edges (for culling) ───────────────────────────────────────────
  const visibleEdges = useMemo(() => {
    const visibleIds = new Set(visibleNodeLayouts.map((nl) => nl.nodeId));
    return layout.edgeLayouts.filter(
      (edge) => visibleIds.has(edge.fromId) || visibleIds.has(edge.toId)
    );
  }, [visibleNodeLayouts, layout.edgeLayouts]);

  // ── Derived edge status pairs (memoized) ──────────────────────────────────
  const edgesWithStatuses = useMemo(
    () =>
      visibleEdges.map((edge) => ({
        edge,
        fromStatus: statuses.get(edge.fromId) ?? 'locked',
        toStatus: statuses.get(edge.toId) ?? 'locked',
      })),
    [visibleEdges, statuses],
  );

  // ── Reset view button handler ─────────────────────────────────────────────────
  const handleResetView = useCallback(() => {
    const clamped = clampTranslation(initialOffsetX, initialOffsetY, 0.65);
    translateX.value = withSpring(clamped.x, { damping: 22, stiffness: 200 });
    translateY.value = withSpring(clamped.y, { damping: 22, stiffness: 200 });
    scale.value = withSpring(0.65, { damping: 22, stiffness: 200 });
    savedTranslateX.value = clamped.x;
    savedTranslateY.value = clamped.y;
    savedScale.value = 0.65;
  }, [initialOffsetX, initialOffsetY]);

  return (
    <View style={[styles.container, { width: screenW, height: screenH }]}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.canvas, canvasAnimatedStyle]}>
          {/* SVG edge layer */}
          <Svg
            width={canvasWidth}
            height={canvasHeight}
            style={StyleSheet.absoluteFill}
          >
            {edgesWithStatuses.map(({ edge, fromStatus, toStatus }) => (
              <SkillEdge
                key={`${edge.fromId}→${edge.toId}`}
                edge={edge}
                fromStatus={fromStatus}
                toStatus={toStatus}
              />
            ))}
          </Svg>

          {/* Node layer (culled) */}
          {visibleNodeLayouts.map((nl) => {
            const node = graph.nodeMap.get(nl.nodeId);
            if (!node) return null;
            const status = statuses.get(nl.nodeId) ?? 'locked';

            return (
              <SkillNode
                key={nl.nodeId}
                node={node}
                status={status}
                x={nl.position.x}
                y={nl.position.y}
                onPress={handleNodePress}
                onLongPress={handleNodeLongPress}
              />
            );
          })}
        </Animated.View>
      </GestureDetector>

      {/* Zoom level indicator */}
      <View style={styles.zoomIndicator}>
        <Text style={styles.zoomText}>{zoomPercent}%</Text>
      </View>

      {/* Reset view button */}
      <Pressable style={styles.resetBtn} onPress={handleResetView}>
        <Text style={styles.resetBtnText}>⟲ Reset</Text>
      </Pressable>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  zoomIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 20,
  },
  zoomText: {
    ...Typography.caption,
    color: Colors.tierFoundation,
    fontWeight: '700',
  },
  resetBtn: {
    position: 'absolute',
    top: 140,
    right: 20,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 20,
  },
  resetBtnText: {
    ...Typography.caption,
    color: Colors.tierFoundation,
    fontWeight: '700',
  },
});
