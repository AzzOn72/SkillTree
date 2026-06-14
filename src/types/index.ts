/**
 * SkillGrid — Core Type Definitions (Expanded)
 *
 * Architecture decisions documented here are intentional.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────────────────────

/** Branded string type — prevents mixing up NodeId with plain strings. */
export type NodeId = string & { readonly __brand: 'NodeId' };

export function makeNodeId(raw: string): NodeId {
  return raw as NodeId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Node Status — Finite State Machine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * locked      → all dependencies not yet met
 * unlockable  → all dependencies completed; ready to be claimed
 * completed   → user has completed this node; XP awarded
 *
 * Valid transitions: locked → unlockable → completed (strictly forward)
 */
export type NodeStatus = 'locked' | 'unlockable' | 'completed';

// ─────────────────────────────────────────────────────────────────────────────
// Skill Node — The Core Data Unit
// ─────────────────────────────────────────────────────────────────────────────

export type NodeTier = 'foundation' | 'intermediate' | 'advanced' | 'elite';

export interface SkillNode {
  /** Globally unique, stable identifier. Never mutated after graph construction. */
  readonly id: NodeId;

  /** Human-readable title, displayed on the canvas node. */
  readonly title: string;

  /** 1-2 sentence description of what this skill entails. */
  readonly description: string;

  /**
   * XP awarded on completion.
   * Range: 10 (trivial) → 500 (elite milestone).
   * Used for progress calculation and visual tier styling.
   */
  readonly xpReward: number;

  /**
   * Depth in the DAG (0 = root with no dependencies).
   * Computed by the layout engine via topological sort; NOT from the LLM.
   * Stored here for O(1) access during layout phase.
   */
  readonly depth: number;

  /** Visual tier — drives color/glow themes on the canvas. */
  readonly tier: NodeTier;

  /**
   * Estimated time to complete.
   * e.g. "2 weeks", "3 months"
   * Purely informational — not used in game logic.
   */
  readonly estimatedDuration: string;

  /** Text descriptions of recommended learning resources (books, courses, topics). */
  readonly learningResources: readonly string[];

  /** Optional tags for future filtering UI. */
  readonly tags: readonly string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Graph — Runtime In-Memory Structure
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SkillGraph is the fully validated, immutable graph structure.
 * Constructed ONCE on graph load and never mutated.
 */
export interface SkillGraph {
  readonly id: string;
  readonly goalTitle: string;
  readonly createdAt: number;
  readonly nodeMap: ReadonlyMap<NodeId, SkillNode>;
  readonly adjacencyOut: ReadonlyMap<NodeId, ReadonlySet<NodeId>>;
  readonly adjacencyIn: ReadonlyMap<NodeId, ReadonlySet<NodeId>>;
  readonly topologicalOrder: readonly NodeId[];
  readonly totalXp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout Engine Output
// ─────────────────────────────────────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

export interface NodeLayout {
  readonly nodeId: NodeId;
  readonly position: Point;
  readonly layer: number;
  readonly indexInLayer: number;
}

export interface EdgeLayout {
  readonly fromId: NodeId;
  readonly toId: NodeId;
  readonly bezierPoints: [Point, Point, Point, Point];
  readonly isLongEdge: boolean;
}

export interface LayoutResult {
  readonly nodeLayouts: ReadonlyMap<NodeId, NodeLayout>;
  readonly edgeLayouts: readonly EdgeLayout[];
  readonly canvasWidth: number;
  readonly canvasHeight: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Tree Store — Runtime Instance
// ─────────────────────────────────────────────────────────────────────────────

export interface TreeInstance {
  readonly graph: SkillGraph;
  readonly layout: LayoutResult;
  readonly rawLLMJson: string;
  statuses: Map<NodeId, NodeStatus>;
  earnedXp: number;
}

export interface TreeIndexEntry {
  readonly id: string;
  readonly goalTitle: string;
  readonly createdAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW: User Profile
// ─────────────────────────────────────────────────────────────────────────────

export interface LearningGoal {
  id: string;
  title: string;
  targetXp: number;
  currentXp: number;
  deadline?: number;
  completed: boolean;
  createdAt: number;
}

export interface PortfolioItem {
  id: string;
  type: 'skill' | 'tree' | 'module';
  title: string;
  description?: string;
  completedAt: number;
  xpEarned: number;
  image?: string;
}

export interface RecentActivity {
  id: string;
  type: 'skill' | 'lesson' | 'research' | 'goal';
  title: string;
  description: string;
  xp: number;
  timestamp: number;
}

export interface UserProfile {
  id: string;
  displayName: string;
  avatarEmoji: string;
  bio: string;
  totalXp: number;
  totalSkillsCompleted: number;
  joinDate: number;
  streakDays: number;
  lastActiveDate: number;
  isPublic: boolean;
  learningGoals: LearningGoal[];
  portfolioItems: PortfolioItem[];
  recentActivity: RecentActivity[];
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Achievements / Badges
// ─────────────────────────────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  unlocked: boolean;
  unlockedAt?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Flashcards
// ─────────────────────────────────────────────────────────────────────────────

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  tags: string[];
  lastReviewed?: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Homework Helper
// ─────────────────────────────────────────────────────────────────────────────

export type HomeworkSubject =
  | 'Math'
  | 'Science'
  | 'English'
  | 'History'
  | 'Programming'
  | 'Other';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export interface StepSolution {
  id: string;
  title: string;
  content: string;
  visualAidUrl?: string;
}

export interface Citation {
  id: string;
  type: 'APA' | 'MLA' | 'Chicago' | 'Harvard';
  content: string;
}

export interface HomeworkSession {
  id: string;
  subject: HomeworkSubject;
  difficulty: DifficultyLevel;
  question: string;
  answer: string;
  steps: StepSolution[];
  citations: Citation[];
  createdAt: number;
}

export interface PerformanceRecord {
  id: string;
  subject: HomeworkSubject;
  topic: string;
  correct: boolean;
  timestamp: number;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  type: 'lesson' | 'practice' | 'video';
  link?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Learning Mode
// ─────────────────────────────────────────────────────────────────────────────

export type SchoolSubject =
  | 'math'
  | 'science'
  | 'english'
  | 'history'
  | 'programming'
  | 'art'
  | 'music'
  | 'other';

export interface LearningModule {
  id: string;
  subject: SchoolSubject;
  title: string;
  description: string;
  steps: LearningStep[];
  completed: boolean;
  progress: number;
  completedSteps: Set<string>;
}

export interface LearningStep {
  id: string;
  type: 'lesson' | 'quiz' | 'practice' | 'video';
  title: string;
  content: string;
  materials: LearningMaterial[];
  quiz?: Quiz;
  practice?: PracticeExercise;
}

export interface LearningMaterial {
  id: string;
  type: 'text' | 'diagram' | 'infographic' | 'video' | 'reference' | 'code_sandbox';
  title: string;
  content: string;
  isDownloadable?: boolean;
  hasClosedCaptions?: boolean;
}

export interface Quiz {
  id: string;
  question: string;
  type: 'multiple_choice' | 'scenario' | 'code';
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface PracticeExercise {
  id: string;
  type: 'code' | 'problem' | 'flashcards';
  prompt: string;
  initialCode?: string;
  solution: string;
}

export interface Note {
  id: string;
  moduleId: string;
  stepId: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Research Mode
// ─────────────────────────────────────────────────────────────────────────────

export type CitationStyle = 'APA' | 'MLA' | 'Chicago' | 'Harvard' | 'IEEE';

export interface Source {
  id: string;
  title: string;
  authors?: string;
  url?: string;
  publication?: string;
  year?: number;
  style: CitationStyle;
  citation: string;
  notes?: string;
  addedAt: number;
}

export interface ResearchNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  sourceIds?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ResearchProject {
  id: string;
  title: string;
  description: string;
  notes: ResearchNote[];
  sources: Source[];
  tags: string[];
  createdAt: number;
  status: 'planning' | 'in_progress' | 'completed';
  aiSummary?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Zustand Store — Expanded State & Actions
// ─────────────────────────────────────────────────────────────────────────────

export interface SkillGridState {
  // ── Original multi-tree state ─────────────────────────────────────────────
  trees: Map<string, TreeInstance>;
  activeTreeId: string | null;
  apiKey: string | null;
  selectedNodeId: NodeId | null;
  isLoading: boolean;
  loadingMessage: string;
  error: AppError | null;

  // ── NEW: User Profile ─────────────────────────────────────────────────────
  profile: UserProfile;

  // ── NEW: Achievements ─────────────────────────────────────────────────────
  achievements: Achievement[];

  // ── NEW: Flashcards ───────────────────────────────────────────────────────
  flashcards: Flashcard[];

  // ── NEW: Homework Helper ──────────────────────────────────────────────────
  homeworkSessions: HomeworkSession[];
  performanceRecords: PerformanceRecord[];
  recommendations: Recommendation[];

  // ── NEW: Learning Mode ────────────────────────────────────────────────────
  learningModules: LearningModule[];
  activeLearningModule: string | null;
  notes: Note[];

  // ── NEW: Research Mode ────────────────────────────────────────────────────
  researchProjects: ResearchProject[];
  activeResearchProject: string | null;

  // ── NEW: UI State ─────────────────────────────────────────────────────────
  activeTab: 'home' | 'profile' | 'learn' | 'homework' | 'research';
}

export interface SkillGridActions {
  // ── Original actions ──────────────────────────────────────────────────────
  setApiKey: (key: string) => void;
  generateSkillTree: (goalTitle: string) => Promise<void>;
  loadGraph: (rawJson: string, goalTitle: string) => Promise<void>;
  setActiveTree: (id: string | null) => void;
  deleteTree: (id: string) => void;
  completeNode: (id: NodeId, treeId?: string) => void;
  selectNode: (id: NodeId | null) => void;
  hydrateFromStorage: () => void;
  getTreeIndex: () => TreeIndexEntry[];
  resetTreeProgress: (id: string) => void;
  resetAllTrees: () => void;

  // ── NEW: User Profile Actions ─────────────────────────────────────────────
  updateProfile: (updates: Partial<UserProfile>) => void;
  addLearningGoal: (goal: Omit<LearningGoal, 'id' | 'createdAt' | 'completed' | 'currentXp'>) => void;
  updateLearningGoal: (id: string, updates: Partial<LearningGoal>) => void;
  deleteLearningGoal: (id: string) => void;
  addPortfolioItem: (item: Omit<PortfolioItem, 'id' | 'completedAt'>) => void;
  deletePortfolioItem: (id: string) => void;

  // ── NEW: Achievement Actions ──────────────────────────────────────────────
  unlockAchievement: (achievementId: string) => void;

  // ── NEW: Flashcard Actions ────────────────────────────────────────────────
  addFlashcard: (flashcard: Omit<Flashcard, 'id'>) => void;
  updateFlashcard: (id: string, updates: Partial<Flashcard>) => void;
  deleteFlashcard: (id: string) => void;

  // ── NEW: Homework Helper Actions ──────────────────────────────────────────
  addHomeworkSession: (session: Omit<HomeworkSession, 'id' | 'createdAt'>) => void;
  deleteHomeworkSession: (id: string) => void;
  addPerformanceRecord: (record: Omit<PerformanceRecord, 'id' | 'timestamp'>) => void;
  updateRecommendations: (recommendations: Recommendation[]) => void;

  // ── NEW: Learning Mode Actions ────────────────────────────────────────────
  setActiveLearningModule: (id: string | null) => void;
  updateLearningModuleProgress: (id: string, progress: number) => void;
  generateCustomLearningModule: (topic: string) => Promise<void>;
  addLearningModule: (module: Omit<LearningModule, 'id' | 'completed' | 'progress' | 'completedSteps'>) => void;
  deleteLearningModule: (id: string) => void;
  completeLearningStep: (moduleId: string, stepId: string) => void;
  addNote: (moduleId: string, stepId: string, content: string) => void;
  updateNote: (noteId: string, content: string) => void;
  deleteNote: (noteId: string) => void;

  // ── NEW: Research Mode Actions ────────────────────────────────────────────
  addResearchProject: (project: Omit<ResearchProject, 'id' | 'createdAt'>) => void;
  updateResearchProject: (id: string, updates: Partial<ResearchProject>) => void;
  deleteResearchProject: (id: string) => void;
  addResearchSource: (projectId: string, source: Omit<Source, 'id' | 'addedAt'>) => void;
  updateResearchSource: (projectId: string, sourceId: string, updates: Partial<Source>) => void;
  deleteResearchSource: (projectId: string, sourceId: string) => void;
  addResearchNote: (projectId: string, note: Omit<ResearchNote, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateResearchNote: (projectId: string, noteId: string, updates: Partial<ResearchNote>) => void;
  deleteResearchNote: (projectId: string, noteId: string) => void;
  setActiveResearchProject: (id: string | null) => void;

  // ── NEW: UI State Actions ─────────────────────────────────────────────────
  setActiveTab: (tab: SkillGridState['activeTab']) => void;
}

export type SkillGridStore = SkillGridState & SkillGridActions;

// ─────────────────────────────────────────────────────────────────────────────
// LLM API — Raw Input/Output Contracts
// ─────────────────────────────────────────────────────────────────────────────

export interface RawLLMNode {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  tier: NodeTier;
  dependencies: string[];
  estimatedDuration: string;
  learningResources?: string[];
  tags: string[];
}

export interface RawLLMResponse {
  goalTitle: string;
  nodes: RawLLMNode[];
  suggestedEntryNodes?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

export type ValidationErrorCode =
  | 'INVALID_JSON'
  | 'SCHEMA_MISMATCH'
  | 'DANGLING_DEPENDENCY'
  | 'SELF_REFERENCE'
  | 'CYCLE_DETECTED'
  | 'EMPTY_GRAPH'
  | 'NO_ROOT_NODES';

export interface ValidationError {
  readonly code: ValidationErrorCode;
  readonly message: string;
  readonly affectedNodeIds?: NodeId[];
}

export interface ValidationSuccess {
  readonly valid: true;
  readonly parsed: RawLLMResponse;
}

export interface ValidationFailure {
  readonly valid: false;
  readonly errors: ValidationError[];
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

// ─────────────────────────────────────────────────────────────────────────────
// App Error
// ─────────────────────────────────────────────────────────────────────────────

export type AppErrorType =
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'STORAGE_ERROR'
  | 'UNKNOWN';

export interface AppError {
  readonly type: AppErrorType;
  readonly message: string;
  readonly detail?: string;
  readonly recoverable: boolean;
  readonly canRegenerate: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas Interaction
// ─────────────────────────────────────────────────────────────────────────────

export interface CanvasViewport {
  translateX: number;
  translateY: number;
  scale: number;
}

export const CANVAS_CONSTRAINTS = {
  MIN_SCALE: 0.15,
  MAX_SCALE: 2.0,
  NODE_WIDTH: 180,
  NODE_HEIGHT: 100,
  X_PADDING: 90,
  Y_PADDING: 180,
  CANVAS_PADDING: 120,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// XP & Progression
// ─────────────────────────────────────────────────────────────────────────────

export interface ProgressStats {
  earnedXp: number;
  totalXp: number;
  progressPercent: number;
  completedCount: number;
  totalCount: number;
  unlockableCount: number;
}
