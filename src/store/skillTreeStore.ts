import { create } from 'zustand';
import { useMemo } from 'react';
import type {
  NodeId,
  NodeStatus,
  SkillGraph,
  SkillGridStore,
  TreeInstance,
  TreeIndexEntry,
  AppError,
  UserProfile,
  Achievement,
  Flashcard,
  HomeworkSession,
  LearningModule,
  ResearchProject,
  ResearchNote,
  Note,
  LearningGoal,
  PortfolioItem,
  Source,
  Recommendation,
  PerformanceRecord,
} from '../types';
import { validateLLMResponse } from '../engine/validator';
import { buildGraph, generateGraphId, initializeStatuses } from '../engine/graph';
import { computeLayout } from '../engine/layout';
import { callGroqAPI, callGroqGenerateLearningModule } from '../api/groq';

// ─────────────────────────────────────────────────────────────────────────────
// Initial State Helpers
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-skill',
    title: 'First Steps',
    description: 'Complete your first skill node',
    icon: '🚀',
    xpReward: 50,
    unlocked: false,
  },
  {
    id: 'first-tree',
    title: 'Explorer',
    description: 'Create your first skill tree',
    icon: '🌳',
    xpReward: 100,
    unlocked: false,
  },
  {
    id: '10-skills',
    title: 'Apprentice',
    description: 'Complete 10 skill nodes',
    icon: '⚡',
    xpReward: 200,
    unlocked: false,
  },
  {
    id: '500-xp',
    title: 'Rising Star',
    description: 'Earn 500 total XP',
    icon: '⭐',
    xpReward: 300,
    unlocked: false,
  },
  {
    id: '3-day-streak',
    title: 'Consistent',
    description: 'Maintain a 3-day streak',
    icon: '🔥',
    xpReward: 150,
    unlocked: false,
  },
  {
    id: 'first-flashcard',
    title: 'Flashcard Master',
    description: 'Create your first flashcard',
    icon: '📝',
    xpReward: 50,
    unlocked: false,
  },
  {
    id: 'first-research',
    title: 'Researcher',
    description: 'Create your first research project',
    icon: '🔬',
    xpReward: 75,
    unlocked: false,
  },
  {
    id: 'first-module',
    title: 'Learning Journey',
    description: 'Complete your first learning module',
    icon: '📚',
    xpReward: 75,
    unlocked: false,
  },
];

const INITIAL_PROFILE: UserProfile = {
  id: 'user-1',
  displayName: 'Learner',
  avatarEmoji: '🧑‍💻',
  bio: 'Learning new skills every day!',
  totalXp: 0,
  totalSkillsCompleted: 0,
  joinDate: Date.now(),
  streakDays: 0,
  lastActiveDate: Date.now(),
  isPublic: false,
  learningGoals: [],
  portfolioItems: [],
  recentActivity: [],
};

const INITIAL_LEARNING_MODULES: LearningModule[] = [
  {
    id: 'math-algebra',
    subject: 'math',
    title: 'Algebra Fundamentals',
    description: 'Learn the basics of algebra including variables, equations, and functions',
    steps: [
      {
        id: 'math-step-1',
        type: 'lesson',
        title: 'Introduction to Variables',
        content: 'Learn what a variable is and how to use it in equations!',
        materials: [
          { id: 'mat1', type: 'text', title: 'Basic Explanation', content: 'Variables are symbols that represent values' }
        ]
      },
      {
        id: 'math-step-2',
        type: 'quiz',
        title: 'Quick Quiz',
        content: 'Test your knowledge',
        materials: [],
        quiz: {
          id: 'math-quiz-1',
          question: 'What is 2x + 5 when x = 3?',
          type: 'multiple_choice',
          options: ['9', '11', '13', '15'],
          correctAnswer: 1,
          explanation: '2*3 +5 =6+5=11',
        }
      },
      {
        id: 'math-step-3',
        type: 'lesson',
        title: 'Solving Linear Equations',
        content: 'Learn to solve linear equations step by step',
        materials: []
      },
      {
        id: 'math-step-4',
        type: 'lesson',
        title: 'Understanding Functions',
        content: 'Learn what functions are and how they work',
        materials: []
      },
      {
        id: 'math-step-5',
        type: 'lesson',
        title: 'Graphing Lines',
        content: 'Learn to graph lines on a coordinate plane',
        materials: []
      },
    ],
    completed: false,
    progress: 0,
    completedSteps: new Set()
  },
  {
    id: 'programming-js',
    subject: 'programming',
    title: 'JavaScript Basics',
    description: 'Learn the fundamentals of JavaScript programming',
    steps: [
      {
        id: 'js-step-1',
        type: 'lesson',
        title: 'Variables and Data Types',
        content: 'Learn about variables and different data types!',
        materials: [
          { id: 'js-mat-1', type: 'text', title: 'Variable Types', content: 'var, let, const' }
        ]
      },
      {
        id: 'js-step-2',
        type: 'quiz',
        title: 'Variable Declaration Quiz',
        content: 'Test yourself',
        materials: [],
        quiz: {
          id: 'js-quiz-1',
          question: 'Which keyword declares a constant variable?',
          type: 'multiple_choice',
          options: ['var', 'let', 'const', 'constant'],
          correctAnswer: 2,
          explanation: 'const is used to declare variables that cannot be reassigned.',
        }
      },
      {
        id: 'js-step-3',
        type: 'lesson',
        title: 'Control Flow (If/Else)',
        content: 'Learn about if else statements',
        materials: []
      },
      {
        id: 'js-step-4',
        type: 'lesson',
        title: 'Functions',
        content: 'Learn how to write functions',
        materials: []
      },
      {
        id: 'js-step-5',
        type: 'lesson',
        title: 'Arrays and Objects',
        content: 'Learn about arrays and objects',
        materials: []
      },
    ],
    completed: false,
    progress: 0,
    completedSteps: new Set()
  },
  {
    id: 'science-biology',
    subject: 'science',
    title: 'Introduction to Biology',
    description: 'Explore the basics of life science',
    steps: [
      {
        id: 'bio-step-1',
        type: 'lesson',
        title: 'Cell Theory',
        content: 'Learn about cell theory',
        materials: []
      },
      {
        id: 'bio-step-2',
        type: 'lesson',
        title: 'DNA and Genetics',
        content: 'Learn about DNA',
        materials: []
      },
    ],
    completed: false,
    progress: 0,
    completedSteps: new Set()
  },
  {
    id: 'history-world',
    subject: 'history',
    title: 'World History Overview',
    description: 'A journey through key historical events',
    steps: [
      { id: 'hist-step-1', type: 'lesson', title: 'Ancient Civilizations', content: '', materials: [] }
    ],
    completed: false,
    progress: 0,
    completedSteps: new Set()
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Store Creation
// ─────────────────────────────────────────────────────────────────────────────

export const useSkillGridStore = create<SkillGridStore>((set, get) => ({
  // ── Initial State ─────────────────────────────────────────────────────────
  trees: new Map(),
  activeTreeId: null,
  apiKey: null,
  selectedNodeId: null,
  isLoading: false,
  loadingMessage: '',
  error: null,
  profile: INITIAL_PROFILE,
  achievements: INITIAL_ACHIEVEMENTS,
  flashcards: [],
  homeworkSessions: [],
  performanceRecords: [],
  recommendations: [],
  learningModules: INITIAL_LEARNING_MODULES,
  activeLearningModule: null,
  notes: [],
  researchProjects: [],
  activeResearchProject: null,
  activeTab: 'home',

  // ── Original Actions ─────────────────────────────────────────────────────
  setApiKey: (key: string) => {
    set({ apiKey: key.trim() });
  },

  generateSkillTree: async (goalTitle: string) => {
    const { apiKey, loadGraph } = get();

    const resolvedKey =
      apiKey ??
      (typeof process !== 'undefined'
        ? process.env.EXPO_PUBLIC_GROQ_API_KEY
        : undefined) ??
      '';

    if (!resolvedKey) {
      set({
        error: {
          type: 'VALIDATION_ERROR',
          message: 'No API key configured.',
          detail: 'Enter your Groq API key in Settings to generate a skill tree.',
          recoverable: true,
          canRegenerate: false,
        },
      });
      return;
    }

    set({
      isLoading: true,
      loadingMessage: '✦ Calling Groq / Llama-3…',
      error: null,
    });

    try {
      const rawJson = await callGroqAPI(goalTitle, resolvedKey);
      await loadGraph(rawJson, goalTitle);
      
      // Check for "First Tree" achievement
      const state = get();
      if (state.trees.size === 1 && !state.achievements.find(a => a.id === 'first-tree')?.unlocked) {
        get().unlockAchievement('first-tree');
      }
    } catch (err: unknown) {
      console.error('Skill tree generation error:', err);
      const detail = err instanceof Error ? err.message : String(err);
      set({
        isLoading: false,
        loadingMessage: '',
        error: {
          type: 'NETWORK_ERROR',
          message: 'Failed to generate skill tree.',
          detail,
          recoverable: true,
          canRegenerate: true,
        },
      });
    }
  },

  loadGraph: async (rawJson: string, goalTitle: string) => {
    set({ isLoading: true, loadingMessage: '✦ Parsing response…' });

    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawJson);
      } catch {
        throw new Error('LLM returned malformed JSON.');
      }

      set({ loadingMessage: '✦ Validating skill tree…' });
      const validation = validateLLMResponse(parsed);
      if (!validation.valid) {
        const detail = validation.errors.map((e) => `[${e.code}] ${e.message}`).join('\n');
        throw new Error(`Validation failed: ${detail}`);
      }

      set({ loadingMessage: '✦ Building graph…' });
      const graphId = generateGraphId(goalTitle);
      const graph = buildGraph(validation.parsed, graphId);

      set({ loadingMessage: '✦ Computing layout…' });
      const layout = computeLayout(graph);
      const statuses = initializeStatuses(graph);

      const instance: TreeInstance = {
        graph,
        layout,
        rawLLMJson: rawJson,
        statuses,
        earnedXp: 0,
      };

      set((state) => ({
        trees: new Map(state.trees).set(graphId, instance),
        activeTreeId: graphId,
        isLoading: false,
        loadingMessage: '',
        error: null,
      }));
    } catch (err: unknown) {
      console.error('Load graph error:', err);
      const detail = err instanceof Error ? err.message : String(err);
      set({
        isLoading: false,
        loadingMessage: '',
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Failed to build skill tree.',
          detail,
          recoverable: true,
          canRegenerate: true,
        },
      });
    }
  },

  setActiveTree: (id: string | null) => {
    set({ activeTreeId: id, selectedNodeId: null, error: null });
  },

  deleteTree: (id: string) => {
    set((state) => {
      const newTrees = new Map(state.trees);
      newTrees.delete(id);
      let newActiveId = state.activeTreeId;
      if (state.activeTreeId === id) {
        newActiveId = newTrees.size > 0 ? ([...newTrees.keys()][0] as string) : null;
      }
      return { trees: newTrees, activeTreeId: newActiveId, selectedNodeId: null };
    });
  },

  completeNode: (id: NodeId, treeId?: string) => {
    const state = get();
    const targetId = treeId ?? state.activeTreeId;
    if (!targetId) return;

    const instance = state.trees.get(targetId);
    if (!instance) return;

    if (instance.statuses.get(id) !== 'unlockable') {
      return;
    }

    const newStatuses = new Map(instance.statuses);
    newStatuses.set(id, 'completed');

    const downstream = instance.graph.adjacencyOut.get(id);
    if (downstream) {
      for (const neighborId of downstream) {
        if (
          newStatuses.get(neighborId) === 'locked' &&
          isUnlockable(neighborId, instance.graph, newStatuses)
        ) {
          newStatuses.set(neighborId, 'unlockable');
        }
      }
    }

    const completedNode = instance.graph.nodeMap.get(id)!;
    const newEarnedXp = instance.earnedXp + completedNode.xpReward;

    const updatedInstance: TreeInstance = {
      ...instance,
      statuses: newStatuses,
      earnedXp: newEarnedXp,
    };

    set((s) => ({
      trees: new Map(s.trees).set(targetId, updatedInstance),
    }));

    // Update profile
    const currentProfile = get().profile;
    const newTotalSkills = currentProfile.totalSkillsCompleted + 1;
    const newTotalXp = currentProfile.totalXp + completedNode.xpReward;
    
    get().updateProfile({
      totalSkillsCompleted: newTotalSkills,
      totalXp: newTotalXp,
      lastActiveDate: Date.now(),
    });

    // Record activity
    get().recordActivity({
      type: 'skill',
      title: completedNode.title,
      description: `Completed ${completedNode.tier} tier skill in ${instance.graph.goalTitle}`,
      xp: completedNode.xpReward,
    });

    // Check achievements
    if (newTotalSkills === 1) {
      get().unlockAchievement('first-skill');
    }
    if (newTotalSkills >= 10) {
      get().unlockAchievement('10-skills');
    }
    if (newTotalXp >= 500) {
      get().unlockAchievement('500-xp');
    }
  },

  selectNode: (id: NodeId | null) => set({ selectedNodeId: id }),

  hydrateFromStorage: async () => {
    // No-op: in-memory only for Expo Go
  },

  getTreeIndex: () => {
    const state = get();
    const entries: TreeIndexEntry[] = [];
    for (const [id, instance] of state.trees) {
      entries.push({
        id,
        goalTitle: instance.graph.goalTitle,
        createdAt: instance.graph.createdAt,
      });
    }
    return entries.sort((a, b) => b.createdAt - a.createdAt);
  },

  resetTreeProgress: (id: string) => {
    const state = get();
    const instance = state.trees.get(id);
    if (!instance) return;

    const freshStatuses = initializeStatuses(instance.graph);
    const updatedInstance: TreeInstance = {
      ...instance,
      statuses: freshStatuses,
      earnedXp: 0,
    };

    set((s) => ({
      trees: new Map(s.trees).set(id, updatedInstance),
    }));
  },

  resetAllTrees: async () => {
    // Reset everything!
    set({
      trees: new Map(),
      activeTreeId: null,
      selectedNodeId: null,
      error: null,
    });
  },

  // ── New: Profile Actions ─────────────────────────────────────────────────
  updateProfile: (updates: Partial<UserProfile>) => {
    set((state) => ({
      profile: { ...state.profile, ...updates },
    }));
  },
  recordActivity: (activity: Omit<RecentActivity, 'id' | 'timestamp'>) => {
    const newActivity: RecentActivity = {
      ...activity,
      id: 'activity-' + Date.now(),
      timestamp: Date.now(),
    };
    set((state) => ({
      profile: {
        ...state.profile,
        recentActivity: [newActivity, ...state.profile.recentActivity].slice(0, 20),
      },
    }));
  },
  addLearningGoal: (goal: Omit<LearningGoal, 'id' | 'createdAt' | 'completed' | 'currentXp'>) => {
    const newGoal: LearningGoal = {
      ...goal,
      id: 'goal-' + Date.now(),
      createdAt: Date.now(),
      currentXp: 0,
      completed: false,
    };
    set((state) => ({
      profile: {
        ...state.profile,
        learningGoals: [...state.profile.learningGoals, newGoal],
      },
    }));
  },
  updateLearningGoal: (id: string, updates: Partial<LearningGoal>) => {
    set((state) => ({
      profile: {
        ...state.profile,
        learningGoals: state.profile.learningGoals.map((g) =>
          g.id === id ? { ...g, ...updates } : g
        ),
      },
    }));
  },
  deleteLearningGoal: (id: string) => {
    set((state) => ({
      profile: {
        ...state.profile,
        learningGoals: state.profile.learningGoals.filter((g) => g.id !== id),
      },
    }));
  },
  addPortfolioItem: (item: Omit<PortfolioItem, 'id' | 'completedAt'>) => {
    const newItem: PortfolioItem = {
      ...item,
      id: 'portfolio-' + Date.now(),
      completedAt: Date.now(),
    };
    set((state) => ({
      profile: {
        ...state.profile,
        portfolioItems: [...state.profile.portfolioItems, newItem],
      },
    }));
  },
  deletePortfolioItem: (id: string) => {
    set((state) => ({
      profile: {
        ...state.profile,
        portfolioItems: state.profile.portfolioItems.filter((i) => i.id !== id),
      },
    }));
  },

  // ── New: Achievement Actions ─────────────────────────────────────────────
  unlockAchievement: (achievementId: string) => {
    set((state) => {
      const achievement = state.achievements.find(a => a.id === achievementId);
      if (!achievement || achievement.unlocked) {
        return state; // Already unlocked or not found
      }

      const updatedAchievements = state.achievements.map(a =>
        a.id === achievementId ? { ...a, unlocked: true, unlockedAt: Date.now() } : a
      );

      // Add the XP reward to profile
      const newProfile = {
        ...state.profile,
        totalXp: state.profile.totalXp + achievement.xpReward,
      };

      return { achievements: updatedAchievements, profile: newProfile };
    });
  },

  // ── New: Flashcard Actions ───────────────────────────────────────────────
  addFlashcard: (flashcard: Omit<Flashcard, 'id'>) => {
    const newCard: Flashcard = {
      ...flashcard,
      id: 'fc-' + Date.now(),
    };
    set((state) => ({
      flashcards: [...state.flashcards, newCard],
    }));

    // Check flashcard achievement
    const state = get();
    if (state.flashcards.length === 1) {
      state.unlockAchievement('first-flashcard');
    }
  },

  updateFlashcard: (id: string, updates: Partial<Flashcard>) => {
    set((state) => ({
      flashcards: state.flashcards.map(card =>
        card.id === id ? { ...card, ...updates } : card
      ),
    }));
  },

  deleteFlashcard: (id: string) => {
    set((state) => ({
      flashcards: state.flashcards.filter(card => card.id !== id),
    }));
  },

  // ── New: Homework Helper Actions ─────────────────────────────────────────
  addHomeworkSession: (session: Omit<HomeworkSession, 'id' | 'createdAt'>) => {
    const newSession: HomeworkSession = {
      ...session,
      id: 'hw-' + Date.now(),
      createdAt: Date.now(),
    };
    set((state) => ({
      homeworkSessions: [newSession, ...state.homeworkSessions],
    }));
  },

  deleteHomeworkSession: (id: string) => {
    set((state) => ({
      homeworkSessions: state.homeworkSessions.filter(s => s.id !== id),
    }));
  },
  addPerformanceRecord: (record: Omit<PerformanceRecord, 'id' | 'timestamp'>) => {
    const newRecord: PerformanceRecord = {
      ...record,
      id: 'perf-' + Date.now(),
      timestamp: Date.now(),
    };
    set((state) => ({
      performanceRecords: [newRecord, ...state.performanceRecords],
    }));
  },
  updateRecommendations: (recommendations: Recommendation[]) => {
    set(() => ({ recommendations }));
  },

  // ── New: Learning Mode Actions ───────────────────────────────────────────
  setActiveLearningModule: (id: string | null) => {
    set({ activeLearningModule: id });
  },

  updateLearningModuleProgress: (id: string, progress: number) => {
    set((state) => ({
      learningModules: state.learningModules.map(module =>
        module.id === id ? {
          ...module,
          progress: Math.min(100, Math.max(0, progress)),
          completed: progress >= 100,
        } : module
      ),
    }));
  },
  addLearningModule: (module: Omit<LearningModule, 'id' | 'completed' | 'progress' | 'completedSteps'>) => {
    const newModule: LearningModule = {
      ...module,
      id: 'module_' + Date.now(),
      completed: false,
      progress: 0,
      completedSteps: new Set(),
    };
    set((state) => ({
      learningModules: [...state.learningModules, newModule],
    }));
  },
  deleteLearningModule: (id: string) => {
    set((state) => ({
      learningModules: state.learningModules.filter(module => module.id !== id),
    }));
  },
  generateCustomLearningModule: async (topic: string) => {
    const { apiKey } = get();
    const resolvedKey =
      apiKey ??
      (typeof process !== 'undefined'
        ? process.env.EXPO_PUBLIC_GROQ_API_KEY
        : undefined) ??
      '';

    if (!resolvedKey) {
      throw new Error('No API key configured');
    }

    const generated = await callGroqGenerateLearningModule(topic, resolvedKey);
    // Call addLearningModule via state update
    const newModule: LearningModule = {
      id: 'module_' + Date.now(),
      title: generated.title,
      description: generated.description,
      subject: 'other',
      steps: generated.steps || [],
      completed: false,
      progress: 0,
      completedSteps: new Set()
    };
    set((state) => ({
      learningModules: [...state.learningModules, newModule],
    }));
  },
  completeLearningStep: (moduleId: string, stepId: string) => {
    set(state => {
      const moduleIndex = state.learningModules.findIndex(m => m.id === moduleId);
      if (moduleIndex === -1) return state;

      const oldModule = state.learningModules[moduleIndex];
      const newCompletedSteps = new Set(oldModule.completedSteps).add(stepId);
      const newProgress = Math.round((newCompletedSteps.size / oldModule.steps.length) * 100);
      const newCompleted = newProgress >= 100;

      const newModule = {
        ...oldModule,
        completedSteps: newCompletedSteps,
        progress: newProgress,
        completed: newCompleted
      };
      const newModules = [...state.learningModules.map((m, i) => i === moduleIndex ? newModule : m)];

      let newAchievements = state.achievements;
      let newProfile = state.profile;
      if (newCompleted && !state.achievements.find(a => a.id === 'first-module')?.unlocked) {
        const achievement = state.achievements.find(a => a.id === 'first-module');
        if (achievement) {
          newAchievements = state.achievements.map(a => a.id === 'first-module' ? { ...a, unlocked: true, unlockedAt: Date.now() } : a);
          newProfile = { ...state.profile, totalXp: state.profile.totalXp + achievement.xpReward };
        }
      }

      return {
        learningModules: newModules,
        achievements: newAchievements,
        profile: newProfile
      };
    });
  },
  addNote: (moduleId: string, stepId: string, content: string) => {
    const newNote: Note = {
      id: 'note-' + Date.now(),
      moduleId,
      stepId,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    set(state => ({ notes: [...state.notes, newNote] }));
  },
  updateNote: (noteId: string, content: string) => {
    set(state => ({
      notes: state.notes.map(note =>
        note.id === noteId ? { ...note, content, updatedAt: Date.now() } : note
      )
    }));
  },
  deleteNote: (noteId: string) => {
    set(state => ({ notes: state.notes.filter(note => note.id !== noteId) }));
  },

  // ── New: Research Mode Actions ───────────────────────────────────────────
  addResearchProject: (project: Omit<ResearchProject, 'id' | 'createdAt'>) => {
    const newProject: ResearchProject = {
      ...project,
      id: 'rp-' + Date.now(),
      createdAt: Date.now(),
      sources: [], // Initialize empty sources array
      tags: [], // Initialize empty tags array
    };
    set((state) => ({
      researchProjects: [newProject, ...state.researchProjects],
    }));

    // Check first research achievement
    const state = get();
    if (state.researchProjects.length === 1) {
      state.unlockAchievement('first-research');
    }
  },

  updateResearchProject: (id: string, updates: Partial<ResearchProject>) => {
    set((state) => ({
      researchProjects: state.researchProjects.map(proj =>
        proj.id === id ? { ...proj, ...updates } : proj
      ),
    }));
  },

  deleteResearchProject: (id: string) => {
    set((state) => ({
      researchProjects: state.researchProjects.filter(proj => proj.id !== id),
      activeResearchProject: state.activeResearchProject === id ? null : state.activeResearchProject,
    }));
  },

  // --- Source management ---
  addResearchSource: (projectId: string, source: Omit<Source, 'id' | 'addedAt'>) => {
    const newSource: Source = {
      ...source,
      id: 'src-' + Date.now(),
      addedAt: Date.now(),
    };
    set((state) => ({
      researchProjects: state.researchProjects.map(proj =>
        proj.id === projectId ? { ...proj, sources: [...(proj.sources || []), newSource] } : proj
      ),
    }));
  },

  updateResearchSource: (projectId: string, sourceId: string, updates: Partial<Source>) => {
    set((state) => ({
      researchProjects: state.researchProjects.map(proj =>
        proj.id === projectId ? {
          ...proj,
          sources: (proj.sources || []).map(src =>
            src.id === sourceId ? { ...src, ...updates } : src
          )
        } : proj
      ),
    }));
  },

  deleteResearchSource: (projectId: string, sourceId: string) => {
    set((state) => ({
      researchProjects: state.researchProjects.map(proj =>
        proj.id === projectId ? {
          ...proj,
          sources: (proj.sources || []).filter(src => src.id !== sourceId)
        } : proj
      ),
    }));
  },

  addResearchNote: (projectId: string, note: Omit<ResearchNote, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newNote: ResearchNote = {
      ...note,
      id: 'rn-' + Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((state) => ({
      researchProjects: state.researchProjects.map(proj =>
        proj.id === projectId
          ? { ...proj, notes: [newNote, ...proj.notes] }
          : proj
      ),
    }));
  },

  updateResearchNote: (projectId: string, noteId: string, updates: Partial<ResearchNote>) => {
    set((state) => ({
      researchProjects: state.researchProjects.map(proj =>
        proj.id === projectId
          ? {
              ...proj,
              notes: proj.notes.map(note =>
                note.id === noteId ? { ...note, ...updates, updatedAt: Date.now() } : note
              ),
            }
          : proj
      ),
    }));
  },

  deleteResearchNote: (projectId: string, noteId: string) => {
    set((state) => ({
      researchProjects: state.researchProjects.map(proj =>
        proj.id === projectId
          ? { ...proj, notes: proj.notes.filter(n => n.id !== noteId) }
          : proj
      ),
    }));
  },

  setActiveResearchProject: (id: string | null) => {
    set({ activeResearchProject: id });
  },

  // ── New: UI State Actions ────────────────────────────────────────────────
  setActiveTab: (tab: SkillGridStore['activeTab']) => {
    set({ activeTab: tab });
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Helper: isUnlockable
// ─────────────────────────────────────────────────────────────────────────────

function isUnlockable(
  nodeId: NodeId,
  graph: SkillGraph,
  statuses: Map<NodeId, NodeStatus>,
): boolean {
  const deps = graph.adjacencyIn.get(nodeId);
  if (!deps || deps.size === 0) return true;
  for (const dep of deps) {
    if (statuses.get(dep) !== 'completed') return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Selector Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useActiveTree(): TreeInstance | null {
  return useSkillGridStore((s) => {
    if (!s.activeTreeId) return null;
    return s.trees.get(s.activeTreeId) ?? null;
  });
}

export function useProgressStats(treeId?: string) {
  const activeTreeId = useSkillGridStore((s) => s.activeTreeId);
  const targetId = treeId ?? activeTreeId;
  const instance = useSkillGridStore((s) => (targetId ? s.trees.get(targetId) : null));

  return useMemo(() => {
    if (!instance) return null;

    let completedCount = 0;
    let unlockableCount = 0;

    for (const status of instance.statuses.values()) {
      if (status === 'completed') completedCount++;
      else if (status === 'unlockable') unlockableCount++;
    }

    const totalCount = instance.graph.nodeMap.size;
    const totalXp = instance.graph.totalXp;

    return {
      earnedXp: instance.earnedXp,
      totalXp,
      progressPercent: totalXp > 0 ? Math.round((instance.earnedXp / totalXp) * 100) : 0,
      completedCount,
      totalCount,
      unlockableCount,
    };
  }, [instance]);
}

export function useNodeStatus(nodeId: NodeId, treeId?: string): NodeStatus | null {
  return useSkillGridStore((s) => {
    const id = treeId ?? s.activeTreeId;
    if (!id) return null;
    return s.trees.get(id)?.statuses.get(nodeId) ?? null;
  });
}

export function useTreeList(): TreeIndexEntry[] {
  const trees = useSkillGridStore((s) => s.trees);

  return useMemo(() => {
    const entries: TreeIndexEntry[] = [];
    for (const [id, instance] of trees) {
      entries.push({
        id,
        goalTitle: instance.graph.goalTitle,
        createdAt: instance.graph.createdAt,
      });
    }
    return entries.sort((a, b) => b.createdAt - a.createdAt);
  }, [trees]);
}

