/**
 * SkillGrid — Graph Builder
 *
 * Converts a validated RawLLMResponse into the strongly-typed SkillGraph
 * runtime structure. This is the single place where NodeId branding is applied
 * and where Kahn's algorithm computes canonical node depths (stored directly
 * on each SkillNode for O(1) access by the layout engine).
 */

import type {
  NodeId,
  NodeStatus,
  RawLLMResponse,
  SkillGraph,
  SkillNode,
} from '../types';
import { makeNodeId } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the immutable SkillGraph from a validated payload.
 *
 * Steps:
 *  1. Build adjacencyIn / adjacencyOut maps from raw dependency lists
 *  2. Run Kahn's BFS to produce topologicalOrder and depthMap
 *  3. Construct typed SkillNode objects with baked-in depths
 *  4. Compute totalXp as a simple sum
 *
 * @param validated   Already-validated LLM response (from validator.ts)
 * @param graphId     Stable identifier for this graph (caller-supplied)
 */
export function buildGraph(validated: RawLLMResponse, graphId: string): SkillGraph {
  const { nodes } = validated;

  // ── Step 1: Adjacency maps ──────────────────────────────────────────────

  // Pre-populate all nodes so even roots appear in both maps
  const adjacencyIn = new Map<NodeId, Set<NodeId>>();
  const adjacencyOut = new Map<NodeId, Set<NodeId>>();

  for (const node of nodes) {
    const id = makeNodeId(node.id);
    adjacencyIn.set(id, new Set());
    adjacencyOut.set(id, new Set());
  }

  for (const node of nodes) {
    const nodeId = makeNodeId(node.id);
    for (const dep of node.dependencies) {
      const depId = makeNodeId(dep);
      adjacencyIn.get(nodeId)!.add(depId);
      adjacencyOut.get(depId)!.add(nodeId);
    }
  }

  // ── Step 2: Kahn's BFS → topological order + depth map ─────────────────

  // inDegreeCount tracks the number of *unsatisfied* incoming edges per node.
  // Starting at each node's real in-degree, we decrement as we process parents.
  const inDegreeCount = new Map<NodeId, number>();
  for (const [id, deps] of adjacencyIn) {
    inDegreeCount.set(id, deps.size);
  }

  const depthMap = new Map<NodeId, number>();
  const queue: NodeId[] = [];

  // Seed: all root nodes (no dependencies) start at depth 0
  for (const [id, deg] of inDegreeCount) {
    if (deg === 0) {
      queue.push(id);
      depthMap.set(id, 0);
    }
  }

  const topologicalOrder: NodeId[] = [];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    topologicalOrder.push(curr);
    const currDepth = depthMap.get(curr)!;

    for (const neighbor of adjacencyOut.get(curr) ?? new Set<NodeId>()) {
      // Longest-path depth: a node's depth = max(parent depths) + 1.
      // This is critical for multi-parent nodes — they sit below their deepest parent.
      const prevDepth = depthMap.get(neighbor) ?? -1;
      const candidateDepth = currDepth + 1;
      if (candidateDepth > prevDepth) {
        depthMap.set(neighbor, candidateDepth);
      }

      const newDeg = (inDegreeCount.get(neighbor) ?? 0) - 1;
      inDegreeCount.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  // ── Step 3: Build typed SkillNode objects ──────────────────────────────

  const nodeMap = new Map<NodeId, SkillNode>();
  let totalXp = 0;

  for (const raw of nodes) {
    const id = makeNodeId(raw.id);
    const depth = depthMap.get(id) ?? 0;

    const node: SkillNode = {
      id,
      title: raw.title,
      description: raw.description,
      xpReward: raw.xpReward,
      depth,
      tier: raw.tier,
      estimatedDuration: raw.estimatedDuration,
      learningResources: Object.freeze([...(raw.learningResources ?? [])]),
      tags: Object.freeze([...raw.tags]),
    };

    nodeMap.set(id, node);
    totalXp += node.xpReward;
  }

  // ── Step 4: Assemble final graph ───────────────────────────────────────

  return {
    id: graphId,
    goalTitle: validated.goalTitle,
    createdAt: Date.now(),
    nodeMap,
    // ReadonlyMap/ReadonlySet — cast is safe; we never mutate these after construction
    adjacencyOut: adjacencyOut as ReadonlyMap<NodeId, ReadonlySet<NodeId>>,
    adjacencyIn: adjacencyIn as ReadonlyMap<NodeId, ReadonlySet<NodeId>>,
    topologicalOrder,
    totalXp,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Initialization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Produce the initial status map for a freshly loaded graph.
 *
 * Root nodes (adjacencyIn size = 0) begin as 'unlockable'.
 * All others begin as 'locked'.
 *
 * This function never reads from MMKV — it always produces a clean-slate map.
 * Restoring persisted progress is handled in the store's hydrateFromStorage().
 */
export function initializeStatuses(graph: SkillGraph): Map<NodeId, NodeStatus> {
  const statuses = new Map<NodeId, NodeStatus>();

  for (const [id] of graph.nodeMap) {
    const deps = graph.adjacencyIn.get(id);
    const isRoot = !deps || deps.size === 0;
    statuses.set(id, isRoot ? 'unlockable' : 'locked');
  }

  return statuses;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: Generate a stable graph ID from a goal title
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive a URL-safe, lowercase, timestamped ID from a goal string.
 * e.g. "Quant Trader" → "quant-trader-1718312400000"
 */
export function generateGraphId(goalTitle: string): string {
  const slug = goalTitle
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 40);
  return `${slug}-${Date.now()}`;
}
