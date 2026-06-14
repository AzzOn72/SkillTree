/**
 * SkillGrid — SkillCanvas Component (Fixed & Enhanced)
 *
 * Fixed issues:
 *  - Improved navigation with relaxed boundaries
 *  - Better initial positioning
 *  - Moved controls to bottom to avoid covering top
 *  - Improved zoom range and responsiveness
 *  - Added zoom in/out buttons for accessibility
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
import Svg from 'react-native-svg';
import { SkillNode } from './SkillNode';
import { SkillEdge } from './SkillEdge';
import { Colors, Typography, Radii } from '../../constants/theme';
import { CANVAS_CONSTRAINTS } from '../../types';
import type { NodeId, NodeStatus, LayoutResult, SkillGraph } from '../../types';

const { NODE_WIDTH, NODE_HEIGHT } = CANVAS_CONSTRAINTS;
const MIN_SCALE = 0.2;
const MAX_SCALE = 3.0;

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
  
  // ── Canvas origin offset: center the graph initially ─────────────────────
  const initialOffsetX = screenW / 2 - (canvasWidth / 2) * 0.8;
  const initialOffsetY = screenH / 2 - (canvasHeight / 2) * 0.8;

  // ── Reanimated shared values ──────────────────────────────────────────────
  const translateX = useSharedValue(initialOffsetX);
  const translateY = useSharedValue(initialOffsetY);
  const scale = useSharedValue(0.8);

  const savedTranslateX = useSharedValue(initialOffsetX);
  const savedTranslateY = useSharedValue(initialOffsetY);
  const savedScale = useSharedValue(0.8);
  const lastScale = useSharedValue(1);

  // ── Boundary calculation function (relaxed) ──────────────────────────────
  const clampTranslation = (x: number, y: number, s: number) => {
    'worklet';
    // Allow more space around the canvas
    const padding = 200;
    const minX = screenW - (canvasWidth + padding) * s;
    const maxX = padding * s;
    const minY = screenH - (canvasHeight + padding) * s;
    const maxY = padding * s;

    return {
      x: clamp(x, minX, maxX),
      y: clamp(y, minY, maxY),
    };
  };

  // ── Pan Gesture (with inertia) ────────────────────────────────────────────
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
        deceleration: 0.99,
      });
      translateY.value = withDecay({
        velocity: e.velocityY,
        deceleration: 0.99,
      });
      
      // Clamp after decay with spring
      setTimeout(() => {
        const clamped = clampTranslation(translateX.value, translateY.value, scale.value);
        translateX.value = withSpring(clamped.x, { damping: 25, stiffness: 300 });
        translateY.value = withSpring(clamped.y, { damping: 25, stiffness: 300 });
        savedTranslateX.value = clamped.x;
        savedTranslateY.value = clamped.y;
      }, 100);
    });

  // ── Pinch Gesture (improved) ──────────────────────────────────────────────
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

  // ── Animated canvas transform ────────────────────────────────────────────
  const canvasAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // ── Zoom level indicator ──────────────────────────────────────────────────
  const zoomPercent = Math.round(scale.value * 100);

  // ── Stable callback refs ──────────────────────────────────────────────────
  const handleNodePress = useCallback(
    (id: NodeId) => onNodePress(id),
    [onNodePress],
  );
  const handleNodeLongPress = useCallback(
    (id: NodeId) => onNodeLongPress(id),
    [onNodeLongPress],
  );

  // ── Zoom in/out handlers ──────────────────────────────────────────────────
  const handleZoomIn = useCallback(() => {
    const newScale = clamp(scale.value * 1.3, MIN_SCALE, MAX_SCALE);
    const clamped = clampTranslation(translateX.value, translateY.value, newScale);
    translateX.value = withSpring(clamped.x, { damping: 20, stiffness: 200 });
    translateY.value = withSpring(clamped.y, { damping: 20, stiffness: 200 });
    scale.value = withSpring(newScale, { damping: 20, stiffness: 200 });
    savedTranslateX.value = clamped.x;
    savedTranslateY.value = clamped.y;
    savedScale.value = newScale;
  }, []);

  const handleZoomOut = useCallback(() => {
    const newScale = clamp(scale.value * 0.7, MIN_SCALE, MAX_SCALE);
    const clamped = clampTranslation(translateX.value, translateY.value, newScale);
    translateX.value = withSpring(clamped.x, { damping: 20, stiffness: 200 });
    translateY.value = withSpring(clamped.y, { damping: 20, stiffness: 200 });
    scale.value = withSpring(newScale, { damping: 20, stiffness: 200 });
    savedTranslateX.value = clamped.x;
    savedTranslateY.value = clamped.y;
    savedScale.value = newScale;
  }, []);

  // ── Reset view button handler ─────────────────────────────────────────────
  const handleResetView = useCallback(() => {
    const clamped = clampTranslation(initialOffsetX, initialOffsetY, 0.8);
    translateX.value = withSpring(clamped.x, { damping: 25, stiffness: 300 });
    translateY.value = withSpring(clamped.y, { damping: 25, stiffness: 300 });
    scale.value = withSpring(0.8, { damping: 25, stiffness: 300 });
    savedTranslateX.value = clamped.x;
    savedTranslateY.value = clamped.y;
    savedScale.value = 0.8;
  }, [initialOffsetX, initialOffsetY]);

  // ── Viewport Culling Logic ────────────────────────────────────────────────
  const visibleNodeLayouts = useMemo(() => {
    const padding = 200;
    const currentScale = scale.value || 0.8;
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

      {/* Bottom control bar */}
      <View style={styles.controlsContainer}>
        {/* Zoom out button */}
        <Pressable style={styles.controlBtn} onPress={handleZoomOut}>
          <Text style={styles.controlBtnText}>−</Text>
        </Pressable>

        {/* Zoom indicator */}
        <View style={styles.zoomIndicator}>
          <Text style={styles.zoomText}>{zoomPercent}%</Text>
        </View>

        {/* Zoom in button */}
        <Pressable style={styles.controlBtn} onPress={handleZoomIn}>
          <Text style={styles.controlBtnText}>+</Text>
        </Pressable>

        {/* Reset button */}
        <Pressable style={styles.resetBtn} onPress={handleResetView}>
          <Text style={styles.resetBtnText}>Reset</Text>
        </Pressable>
      </View>
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
  controlsContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 20,
  },
  controlBtn: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radii.full,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnText: {
    fontSize: 24,
    color: Colors.tierFoundation,
    fontWeight: '700',
  },
  zoomIndicator: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  zoomText: {
    ...Typography.caption,
    color: Colors.tierFoundation,
    fontWeight: '700',
  },
  resetBtn: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resetBtnText: {
    ...Typography.caption,
    color: Colors.tierFoundation,
    fontWeight: '700',
  },
});
