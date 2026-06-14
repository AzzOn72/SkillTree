/**
 * SkillGrid — Client-Side Validation Pipeline
 *
 * Five-phase validation that runs on every raw LLM payload before any graph
 * state is written. Kahn's algorithm doubles as both topological sorter (in
 * layout.ts) AND cycle detector here — if it processes fewer nodes than the
 * total, unreachable nodes are stuck in a cycle.
 */

import { z } from 'zod';
import type {
  RawLLMNode,
  RawLLMResponse,
  ValidationResult,
  ValidationError,
  NodeId,
} from '../types';
import { makeNodeId } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schemas (Phase 1)
// ─────────────────────────────────────────────────────────────────────────────

const NodeTierSchema = z.enum(['foundation', 'intermediate', 'advanced', 'elite']);

const RawLLMNodeSchema = z.object({
  id: z.string().min(1, 'Node id cannot be empty'),
  title: z.string().min(1, 'Node title cannot be empty').max(80),
  description: z.string().min(1).max(400),
  xpReward: z
    .number()
    .int('xpReward must be an integer')
    .min(1, 'xpReward must be positive')
    .max(1000, 'xpReward exceeds maximum of 1000'),
  tier: NodeTierSchema,
  dependencies: z.array(z.string()),
  estimatedDuration: z.string().min(1),
  learningResources: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()),
});

const RawLLMResponseSchema = z.object({
  goalTitle: z.string().min(1, 'goalTitle cannot be empty'),
  nodes: z
    .array(RawLLMNodeSchema)
    .min(1, 'nodes array must contain at least one node'),
  suggestedEntryNodes: z.array(z.string()).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Public Entry Point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the complete 5-phase validation pipeline on an unknown payload.
 * Returns a discriminated union — check `.valid` before accessing `.parsed`.
 *
 * Pipeline:
 *   1. Zod schema validation
 *   2. Empty graph guard
 *   3. Referential integrity  (dangling dependency IDs)
 *   4. Self-reference check   (A depends on A)
 *   5. Cycle detection        (Kahn's algorithm — O(V+E))
 *   6. Root node guard        (at least one node with zero dependencies)
 */
export function validateLLMResponse(raw: unknown): ValidationResult {
  // ── Phase 1: JSON Schema ──────────────────────────────────────────────────
  const zodResult = RawLLMResponseSchema.safeParse(raw);
  if (!zodResult.success) {
    const msg = zodResult.error.issues
      .map((i) => `[${i.path.join('.')}] ${i.message}`)
      .join(' | ');
    return failure([{ code: 'SCHEMA_MISMATCH', message: `Schema validation failed: ${msg}` }]);
  }

  const parsed = zodResult.data;
  const nodes = parsed.nodes;

  // ── Phase 2: Empty graph ──────────────────────────────────────────────────
  if (nodes.length === 0) {
    return failure([{ code: 'EMPTY_GRAPH', message: 'LLM returned zero nodes.' }]);
  }

  // ── Phase 3 & 4: Referential integrity + self-reference ──────────────────
  const nodeIdSet = new Set(nodes.map((n) => n.id));
  const integrityErrors: ValidationError[] = [];

  for (const node of nodes) {
    for (const dep of node.dependencies) {
      if (dep === node.id) {
        integrityErrors.push({
          code: 'SELF_REFERENCE',
          message: `Node "${node.id}" lists itself as a dependency.`,
          affectedNodeIds: [makeNodeId(node.id)],
        });
      } else if (!nodeIdSet.has(dep)) {
        integrityErrors.push({
          code: 'DANGLING_DEPENDENCY',
          message: `Node "${node.id}" depends on "${dep}" which does not exist in the graph.`,
          affectedNodeIds: [makeNodeId(node.id)],
        });
      }
    }
  }

  if (integrityErrors.length > 0) return failure(integrityErrors);

  // ── Phase 5: Cycle detection (Kahn's) ────────────────────────────────────
  const cycleResult = detectCycles(nodes);
  if (cycleResult.hasCycle) {
    return failure([
      {
        code: 'CYCLE_DETECTED',
        message: `Dependency cycle detected. Nodes involved: [${cycleResult.cycleNodes.join(', ')}].`,
        affectedNodeIds: cycleResult.cycleNodes.map(makeNodeId),
      },
    ]);
  }

  // ── Phase 6: At least one root node ──────────────────────────────────────
  const hasRoots = nodes.some((n) => n.dependencies.length === 0);
  if (!hasRoots) {
    return failure([
      {
        code: 'NO_ROOT_NODES',
        message: 'Every node has at least one dependency — no entry point exists. Cannot start the tree.',
      },
    ]);
  }

  return { valid: true, parsed: parsed as RawLLMResponse };
}

// ─────────────────────────────────────────────────────────────────────────────
// Cycle Detection via Kahn's Algorithm
// ─────────────────────────────────────────────────────────────────────────────

interface CycleDetectionResult {
  hasCycle: boolean;
  cycleNodes: string[];
}

/**
 * Uses Kahn's BFS algorithm to detect cycles.
 *
 * Key insight: Kahn's processes all nodes if and only if the graph is a DAG.
 * If `processed < nodes.length`, the remaining nodes (those with inDegree > 0
 * after the BFS) are participating in a cycle and can be identified directly
 * from the inDegree map.
 *
 * Complexity: O(V + E)
 */
function detectCycles(nodes: RawLLMNode[]): CycleDetectionResult {
  // Build inDegree map and forward adjacency for Kahn's BFS
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, node.dependencies.length);
    if (!adj.has(node.id)) adj.set(node.id, []);
  }

  // Build forward adjacency: dep → [nodes that depend on dep]
  for (const node of nodes) {
    for (const dep of node.dependencies) {
      const neighbors = adj.get(dep);
      // dep is guaranteed to exist (checked in Phase 3), but guard defensively
      if (neighbors) neighbors.push(node.id);
    }
  }

  // BFS from all zero-inDegree nodes
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  let processed = 0;
  while (queue.length > 0) {
    const curr = queue.shift()!;
    processed++;

    for (const neighbor of adj.get(curr) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 0) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  if (processed < nodes.length) {
    // Nodes that still have inDegree > 0 could not be processed — they form cycles
    const cycleNodes = [...inDegree.entries()]
      .filter(([, deg]) => deg > 0)
      .map(([id]) => id);
    return { hasCycle: true, cycleNodes };
  }

  return { hasCycle: false, cycleNodes: [] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────────────────────

function failure(errors: ValidationError[]): ValidationResult {
  return { valid: false, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// Type export for use in tests
// ─────────────────────────────────────────────────────────────────────────────
export type { CycleDetectionResult };
