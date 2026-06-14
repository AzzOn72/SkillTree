/**
 * SkillGrid — Sugiyama Layout Engine
 *
 * Produces (x, y) coordinates for every node in a SkillGraph such that:
 *   - No two nodes overlap
 *   - Nodes are organized into depth-based horizontal layers
 *   - Edge crossings are minimized (barycenter heuristic)
 *   - The overall graph is centered on the canvas origin
 *
 * Pipeline (all phases run in pure TypeScript, no dependencies):
 *
 *   computeLayout(graph)
 *     ├── Phase 1: extractDepthMap     — read depths baked into SkillNodes
 *     ├── Phase 2: groupByLayer        — Map<depth, NodeId[]>
 *     ├── Phase 3: minimizeCrossings   — barycenter sort, 3 passes
 *     ├── Phase 4: assignCoordinates   — centered x, regular y
 *     ├── Phase 5: relaxPositions      — fix sibling overlaps, 3 passes
 *     ├── Phase 6: computeEdgeLayouts  — cubic bezier control points
 *     └── Phase 7: computeCanvasBounds — total scrollable canvas size
 */

import type {
  NodeId,
  SkillGraph,
  LayoutResult,
  NodeLayout,
  EdgeLayout,
  Point,
} from '../types';
import { CANVAS_CONSTRAINTS } from '../types';

const {
  NODE_WIDTH,
  NODE_HEIGHT,
  X_PADDING,
  Y_PADDING,
  CANVAS_PADDING,
} = CANVAS_CONSTRAINTS;

// Layer map: depth index → ordered array of node IDs (order is the x-position)
type LayerMap = Map<number, NodeId[]>;

// ─────────────────────────────────────────────────────────────────────────────
// Public Entry Point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the full layout for a SkillGraph.
 *
 * This is a pure function — it has no side effects and can be safely called
 * on a background thread (Hermes worker / Worklet) if needed in the future.
 *
 * @param graph   A fully-constructed SkillGraph (from graph.ts buildGraph)
 * @returns       LayoutResult with per-node positions and bezier edge data
 */
export function computeLayout(graph: SkillGraph): LayoutResult {
  // 1. Read depths from pre-computed SkillNode.depth fields
  const depthMap = extractDepthMap(graph);

  // 2. Bucket nodes by depth into layers
  const layers = groupByLayer(graph, depthMap);

  // 3. Reorder within each layer to minimize edge crossings
  minimizeCrossings(layers, graph, depthMap);

  // 4. Assign (x, y) coordinates — layers are centered, y is uniform
  const rawPositions = assignCoordinates(layers);

  // 5. Resolve any remaining overlaps via 3-pass force relaxation
  const positions = relaxPositions(rawPositions, layers);

  // 6. Compute cubic bezier control points for each DAG edge
  const edgeLayouts = computeEdgeLayouts(graph, positions, depthMap);

  // 7. Compute total canvas bounds (for scroll/pan limits)
  const { canvasWidth, canvasHeight } = computeCanvasBounds(positions);

  // Assemble NodeLayout map
  const nodeLayouts = new Map<NodeId, NodeLayout>();
  for (const [layer, layerNodes] of layers) {
    for (let i = 0; i < layerNodes.length; i++) {
      const nodeId = layerNodes[i];
      nodeLayouts.set(nodeId, {
        nodeId,
        position: positions.get(nodeId)!,
        layer,
        indexInLayer: i,
      });
    }
  }

  return { nodeLayouts, edgeLayouts, canvasWidth, canvasHeight };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 — Extract Depth Map
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read the `depth` field from each SkillNode (computed once by graph.ts).
 * This avoids re-running Kahn's here — graph.ts is the single source of truth
 * for depth values.
 */
function extractDepthMap(graph: SkillGraph): Map<NodeId, number> {
  const depthMap = new Map<NodeId, number>();
  for (const [id, node] of graph.nodeMap) {
    depthMap.set(id, node.depth);
  }
  return depthMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 — Group by Layer
// ─────────────────────────────────────────────────────────────────────────────

function groupByLayer(graph: SkillGraph, depthMap: Map<NodeId, number>): LayerMap {
  const layers: LayerMap = new Map();

  for (const [id] of graph.nodeMap) {
    const depth = depthMap.get(id) ?? 0;
    if (!layers.has(depth)) layers.set(depth, []);
    layers.get(depth)!.push(id);
  }

  // Sort layers by depth index to guarantee top-down iteration order
  return new Map([...layers.entries()].sort(([a], [b]) => a - b));
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 — Crossing Minimization (Barycenter Heuristic)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Barycenter heuristic: for each node in layer L, compute the average
 * x-position of its parents in layer L-1. Sort nodes in L by this average.
 *
 * This is a well-known O(V·E) approximation that reduces crossings by ~70%
 * compared to arbitrary ordering.
 *
 * We run 3 top-down passes; diminishing returns beyond that for our graph sizes.
 */
function minimizeCrossings(
  layers: LayerMap,
  graph: SkillGraph,
  depthMap: Map<NodeId, number>,
): void {
  const maxDepth = Math.max(...depthMap.values(), 0);

  // Track position-within-layer for O(1) barycenter computation
  const posInLayer = new Map<NodeId, number>();
  for (const [, layerNodes] of layers) {
    layerNodes.forEach((id, i) => posInLayer.set(id, i));
  }

  const PASSES = 3;
  for (let pass = 0; pass < PASSES; pass++) {
    for (let depth = 1; depth <= maxDepth; depth++) {
      const layerNodes = layers.get(depth);
      if (!layerNodes || layerNodes.length < 2) continue;

      // Compute barycenter for each node: average x-index of parents in depth-1
      const scored = layerNodes.map((nodeId) => {
        const parents = [...(graph.adjacencyIn.get(nodeId) ?? new Set<NodeId>())].filter(
          (pid) => (depthMap.get(pid) ?? -1) === depth - 1,
        );

        if (parents.length === 0) {
          // Nodes with no parents in the layer above keep their current position
          return { nodeId, score: posInLayer.get(nodeId) ?? Infinity };
        }

        const avg =
          parents.reduce((sum, pid) => sum + (posInLayer.get(pid) ?? 0), 0) /
          parents.length;
        return { nodeId, score: avg };
      });

      // Stable sort: nodes with equal scores keep their relative order
      scored.sort((a, b) => a.score - b.score);

      const sorted = scored.map((s) => s.nodeId);
      layers.set(depth, sorted);

      // Update position lookup so the next layer's pass uses updated positions
      sorted.forEach((id, i) => posInLayer.set(id, i));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4 — Coordinate Assignment
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assign pixel-space (x, y) coordinates.
 *
 * X: Each layer is centered at x=0. Nodes are evenly spaced with X_PADDING.
 *    startX = -(layerWidth / 2) so the layer is symmetric around the origin.
 *
 * Y: Fixed stride per layer: depth * (NODE_HEIGHT + Y_PADDING).
 *    Y_PADDING is intentionally generous (see CANVAS_CONSTRAINTS) to ensure
 *    edges have breathing room on mobile screens.
 */
function assignCoordinates(layers: LayerMap): Map<NodeId, Point> {
  const positions = new Map<NodeId, Point>();

  for (const [depth, layerNodes] of layers) {
    const count = layerNodes.length;
    // Total pixel width occupied by this layer (nodes + gaps)
    const layerWidth = count * NODE_WIDTH + (count - 1) * X_PADDING;
    // Offset so the layer is horizontally centered at x=0
    const startX = -layerWidth / 2;

    for (let i = 0; i < count; i++) {
      const x = startX + i * (NODE_WIDTH + X_PADDING);
      const y = depth * (NODE_HEIGHT + Y_PADDING);
      positions.set(layerNodes[i], { x, y });
    }
  }

  return positions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 5 — Force Relaxation (Overlap Resolution)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Multi-parent convergence can cause siblings to overlap after Phase 4.
 * Three passes of pairwise sibling-push is sufficient for typical layer sizes
 * (3–10 nodes). This runs in O(layer_size²) per layer per pass — negligible.
 *
 * Nodes are pushed apart symmetrically so the layer's center of mass is preserved.
 */
function relaxPositions(
  positions: Map<NodeId, Point>,
  layers: LayerMap,
): Map<NodeId, Point> {
  // Clone positions so we don't mutate the input map
  const relaxed = new Map<NodeId, Point>(positions);
  const MIN_DIST = NODE_WIDTH + X_PADDING;

  const PASSES = 3;
  for (let pass = 0; pass < PASSES; pass++) {
    for (const [, layerNodes] of layers) {
      // Check consecutive pairs (after sorting by x to handle any order)
      const sorted = [...layerNodes].sort(
        (a, b) => (relaxed.get(a)?.x ?? 0) - (relaxed.get(b)?.x ?? 0),
      );

      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i];
        const b = sorted[i + 1];
        const pa = relaxed.get(a)!;
        const pb = relaxed.get(b)!;

        const dist = pb.x - pa.x;
        if (dist < MIN_DIST) {
          const push = (MIN_DIST - dist) / 2;
          relaxed.set(a, { ...pa, x: pa.x - push });
          relaxed.set(b, { ...pb, x: pb.x + push });
        }
      }
    }
  }

  return relaxed;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 6 — Edge Bezier Layout
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute cubic bezier control points for each directed edge.
 *
 * Curve shape:
 *   - Start: bottom-center of the source node
 *   - End:   top-center of the target node
 *   - CP1:   directly below start (same x), at the vertical midpoint
 *   - CP2:   directly above end   (same x), at the vertical midpoint
 *
 * This produces a smooth, vertical S-curve that follows the DAG's
 * top-to-bottom direction without crossing unrelated layers.
 *
 * Long edges (spanning more than 1 layer) use a more pronounced curve
 * by increasing the control point spread, preventing visual confusion.
 */
function computeEdgeLayouts(
  graph: SkillGraph,
  positions: Map<NodeId, Point>,
  depthMap: Map<NodeId, number>,
): EdgeLayout[] {
  const edges: EdgeLayout[] = [];

  for (const [fromId, toSet] of graph.adjacencyOut) {
    const fromPos = positions.get(fromId);
    if (!fromPos) continue;

    for (const toId of toSet) {
      const toPos = positions.get(toId);
      if (!toPos) continue;

      const fromDepth = depthMap.get(fromId) ?? 0;
      const toDepth = depthMap.get(toId) ?? 0;
      const isLongEdge = toDepth - fromDepth > 1;

      // Anchor points on node edges
      const start: Point = {
        x: fromPos.x + NODE_WIDTH / 2,
        y: fromPos.y + NODE_HEIGHT,
      };
      const end: Point = {
        x: toPos.x + NODE_WIDTH / 2,
        y: toPos.y,
      };

      // Control points: converge toward each node's anchor for a natural curve.
      // For long edges, we pull the control points further toward the node
      // to emphasize the connection across multiple layers.
      const curvature = isLongEdge ? 0.65 : 0.5;
      const verticalSpan = end.y - start.y;

      const cp1: Point = {
        x: start.x,
        y: start.y + verticalSpan * curvature,
      };
      const cp2: Point = {
        x: end.x,
        y: end.y - verticalSpan * curvature,
      };

      edges.push({
        fromId,
        toId,
        bezierPoints: [start, cp1, cp2, end],
        isLongEdge,
      });
    }
  }

  return edges;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 7 — Canvas Bounds
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the bounding box of all placed nodes, then add CANVAS_PADDING on
 * all sides. The canvas component uses these dimensions to set scroll bounds.
 */
function computeCanvasBounds(positions: Map<NodeId, Point>): {
  canvasWidth: number;
  canvasHeight: number;
} {
  if (positions.size === 0) {
    return { canvasWidth: 800, canvasHeight: 600 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const { x, y } of positions.values()) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x + NODE_WIDTH);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y + NODE_HEIGHT);
  }

  return {
    canvasWidth: maxX - minX + CANVAS_PADDING * 2,
    canvasHeight: maxY - minY + CANVAS_PADDING * 2,
  };
}
