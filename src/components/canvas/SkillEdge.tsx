/**
 * SkillGrid — SkillEdge Component
 *
 * Renders a single DAG edge as a cubic bezier SVG path.
 *
 * Performance contract: wrapped in React.memo with a custom comparator.
 * This component NEVER re-renders during pan or zoom — those transforms are
 * applied to the parent canvas container, not to individual edges.
 * It only re-renders when the edge's visual state changes (locked → completed).
 *
 * Rendering approach: react-native-svg Path element with a cubic bezier
 * defined by the 4 bezier points from the layout engine.
 */

import React, { memo } from 'react';
import { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import type { EdgeLayout, NodeStatus } from '../../types';
import { Colors } from '../../constants/theme';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface SkillEdgeProps {
  edge: EdgeLayout;
  fromStatus: NodeStatus;
  toStatus: NodeStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Edge Style Resolution
// ─────────────────────────────────────────────────────────────────────────────

interface EdgeStyle {
  stroke: string;
  strokeOpacity: number;
  strokeWidth: number;
  isIlluminated: boolean;
}

function resolveEdgeStyle(fromStatus: NodeStatus, toStatus: NodeStatus): EdgeStyle {
  if (fromStatus === 'completed' && toStatus === 'completed') {
    // Full path — both endpoints done. Bright illuminated neon.
    return { stroke: Colors.tierIntermediate, strokeOpacity: 0.9, strokeWidth: 2.0, isIlluminated: true };
  }
  if (fromStatus === 'completed' && toStatus === 'unlockable') {
    // Leading edge — source done, destination ready. Pulsing glow upstream.
    return { stroke: Colors.tierFoundation, strokeOpacity: 0.65, strokeWidth: 1.5, isIlluminated: false };
  }
  if (fromStatus === 'completed') {
    // Source done but destination still locked.
    return { stroke: Colors.edgeUnlockable, strokeOpacity: 0.40, strokeWidth: 1.0, isIlluminated: false };
  }
  // Default: both locked.
  return { stroke: Colors.edgeLocked, strokeOpacity: 0.25, strokeWidth: 0.8, isIlluminated: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// Bezier Path Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert the EdgeLayout's 4 bezier points into an SVG cubic bezier path string.
 * Format: M startX startY C cp1X cp1Y cp2X cp2Y endX endY
 */
function buildPathD(edge: EdgeLayout): string {
  const [start, cp1, cp2, end] = edge.bezierPoints;
  return (
    `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} ` +
    `C ${cp1.x.toFixed(1)} ${cp1.y.toFixed(1)}, ` +
    `${cp2.x.toFixed(1)} ${cp2.y.toFixed(1)}, ` +
    `${end.x.toFixed(1)} ${end.y.toFixed(1)}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const SkillEdgeInner: React.FC<SkillEdgeProps> = ({ edge, fromStatus, toStatus }) => {
  const style = resolveEdgeStyle(fromStatus, toStatus);
  const pathD = buildPathD(edge);
  const gradientId = `grad-${edge.fromId}-${edge.toId}`;

  return (
    <>
      {style.isIlluminated && (
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={Colors.tierFoundation} stopOpacity="0.9" />
            <Stop offset="100%" stopColor={Colors.tierIntermediate} stopOpacity="0.9" />
          </LinearGradient>
        </Defs>
      )}

      {/* Glow layer — wider, softer stroke behind the main line */}
      {style.isIlluminated && (
        <Path
          d={pathD}
          stroke={Colors.tierIntermediate}
          strokeWidth={style.strokeWidth * 5}
          strokeOpacity={0.18}
          fill="none"
          strokeLinecap="round"
        />
      )}

      {/* Main edge line */}
      <Path
        d={pathD}
        stroke={style.isIlluminated ? `url(#${gradientId})` : style.stroke}
        strokeWidth={style.strokeWidth}
        strokeOpacity={style.strokeOpacity}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={toStatus === 'locked' ? '4 6' : undefined}
      />
    </>
  );
};

/**
 * Custom memo comparator: only re-render if status combination changes.
 * Edge layout positions are immutable after graph load.
 */
export const SkillEdge = memo(SkillEdgeInner, (prev, next) => {
  return (
    prev.fromStatus === next.fromStatus &&
    prev.toStatus === next.toStatus &&
    prev.edge.fromId === next.edge.fromId &&
    prev.edge.toId === next.edge.toId
  );
});

SkillEdge.displayName = 'SkillEdge';
