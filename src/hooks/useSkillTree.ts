/**
 * SkillGrid — Convenience Hook Re-exports
 *
 * Components should import from this file, not directly from the store.
 * This provides a stable public API — if we ever need to restructure the
 * store internals, we only update this file.
 */

export {
  useSkillGridStore,
  useActiveTree,
  useProgressStats,
  useNodeStatus,
  useTreeList,
} from '../store/skillTreeStore';
