/**
 * SkillGrid — Groq API Client
 *
 * Handles the LLM call that generates the skill tree JSON.
 *
 * Key design decisions:
 *   - NO resourceUrl in prompt — LLMs hallucinate URLs ~80% of the time.
 *     We generate real search links client-side instead.
 *   - learningResources[] is text-only: "Read: Effective Python by Brett Slatkin"
 *   - response_format: { type: 'json_object' } forces valid JSON tokens
 *   - 1 automatic retry on failure
 *   - Temperature 0.15 for maximum determinism
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * llama-3.3-70b-versatile — best JSON adherence on Groq.
 */
const MODEL = 'llama-3.3-70b-versatile';

// ─────────────────────────────────────────────────────────────────────────────
// System Prompt — engineered for strict DAG JSON output
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a skill tree generator for a gamified career learning app called SkillGrid.

Your job: given a career goal, output a Directed Acyclic Graph (DAG) of skills needed to achieve it.

OUTPUT FORMAT — return ONLY a single valid JSON object. No markdown. No prose. No code fences. No explanation. The response must begin with { and end with }.

REQUIRED JSON SCHEMA:
{
  "goalTitle": "<string — the career goal as given>",
  "nodes": [
    {
      "id": "<string — unique, snake_case, no spaces, e.g. 'linear_algebra'>",
      "title": "<string — short human-readable title, max 60 chars>",
      "description": "<string — 1-2 sentences describing what this skill covers, max 200 chars>",
      "xpReward": <integer — XP points awarded on completion>,
      "tier": "<'foundation' | 'intermediate' | 'advanced' | 'elite'>",
      "dependencies": ["<id of prerequisite node>", ...],
      "estimatedDuration": "<string — e.g. '2 weeks', '3 months'>",
      "learningResources": [
        "<string — a specific book, course, or topic to study. Examples: 'Book: Cracking the Coding Interview', 'Course: Stanford CS229 on Coursera', 'Topic: Big-O notation and amortized analysis'>",
        ...
      ],
      "tags": ["<string>", ...]
    }
  ]
}

RULES YOU MUST FOLLOW:
1. Generate between 20 and 30 nodes. Comprehensive but not exhaustive.
2. The graph MUST be a strict DAG. NO cycles. If node B depends on A, then A must NOT depend on B through any chain.
3. Every ID in "dependencies" MUST exactly match another node's "id" in this same response.
4. Nodes with no prerequisites have "dependencies": [].
5. At least 3 nodes must have "dependencies": [] (these are the entry points).
6. Use the "tier" field consistently:
   - "foundation": core prerequisites, xpReward 10-60
   - "intermediate": builds on foundation, xpReward 60-150
   - "advanced": builds on intermediate, xpReward 150-350
   - "elite": mastery-level, xpReward 350-500
7. Node IDs must be snake_case and globally unique within the response.
8. "learningResources" must be 1-3 real, specific recommendations per node. DO NOT include URLs. Only include the name of the resource and its type.
9. Return ONLY the JSON object. Absolutely no other text.`;

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call the Groq API to generate a skill tree for the given goal.
 * Includes 1 automatic retry on failure.
 *
 * @param goalTitle  Human-readable career goal (e.g. "Quant Trader")
 * @param apiKey     Groq API key (user's BYOK key or env fallback)
 * @returns          Raw JSON string — NOT yet parsed or validated.
 *
 * @throws           Error on non-2xx HTTP status or missing response content.
 */
export async function callGroqAPI(goalTitle: string, apiKey: string): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await singleCallSkillTree(goalTitle, apiKey);
      return result;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Only retry on server errors (5xx) or rate limits (429)
      if (lastError.message.includes('429') || lastError.message.includes('5')) {
        // Wait 1.5s before retry
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error('Failed after retries');
}

const HOMEWORK_SYSTEM_PROMPT = `You are a helpful, patient homework tutor.
Your job: help students understand their homework questions.
Provide clear, step-by-step explanations without just giving the final answer.
Explain the concepts, not just the solution.
Be encouraging and supportive.
Use simple, easy-to-follow language.`;

const CLASSIFICATION_SYSTEM_PROMPT = `You are an intelligent homework classifier. Given a homework question, classify it into one of the following subjects and estimate its difficulty level.
Subjects: Math, Science, English, History, Programming, Other
Difficulty levels: Beginner, Intermediate, Advanced, Expert
Return your answer ONLY as a valid JSON object with this EXACT structure:
{
  "subject": "Math",
  "difficulty": "Beginner",
  "topic": "Algebra - Linear Equations"
}
No other text allowed.`;

const STEP_BY_STEP_SYSTEM_PROMPT = `You are an expert tutor who provides step-by-step solutions to homework questions. For each question, break the solution down into clear, numbered steps. For STEM subjects, include any relevant formulas, diagrams (describe them in text), and graphs. Return your answer as a valid JSON object with this structure:
{
  "answer": "Final answer (if applicable)",
  "steps": [
    {
      "id": "step-1",
      "title": "Step 1: Understand the Problem",
      "content": "Detailed explanation of this step",
      "visualAidUrl": null
    }
  ],
  "resources": [
    "Link to supplementary resource"
  ]
}
No other text allowed.`;

const CITATION_SYSTEM_PROMPT = `You are a citation generator. Given a topic and a source type, generate citations in APA, MLA, Chicago, and Harvard formats. Return your answer as a valid JSON object with this structure:
{
  "citations": [
    {
      "id": "citation-1",
      "type": "APA",
      "content": "APA formatted citation here"
    },
    {
      "id": "citation-2",
      "type": "MLA",
      "content": "MLA formatted citation here"
    },
    {
      "id": "citation-3",
      "type": "Chicago",
      "content": "Chicago formatted citation here"
    },
    {
      "id": "citation-4",
      "type": "Harvard",
      "content": "Harvard formatted citation here"
    }
  ]
}
No other text allowed.`;

const PLAGIARISM_SYSTEM_PROMPT = `You are an advanced plagiarism checker and originality analyzer. 
Given a piece of text, analyze it thoroughly for originality, context, and potential improvements.
Return your answer ONLY as a valid JSON object with this exact structure:
{
  "originalityScore": 85,
  "findings": "Detailed analysis of originality and potential issues",
  "suggestions": ["Specific suggestion 1", "Specific suggestion 2"],
  "contextAwareAnalysis": "Analysis of the text's context and how it relates to common educational content",
  "recommendedSources": [
    {"title": "Relevant Source Title", "type": "Book/Article/Website", "reason": "Why this source is relevant"}
  ]
}
Rules:
1. originalityScore should be a number between 0 and 100
2. Be specific and helpful in your analysis
3. Provide actionable suggestions
4. recommendedSources should be 1-3 relevant, credible sources
5. Return ONLY the JSON object, no other text`;

export async function callGroqClassifyHomework(
  question: string,
  apiKey: string
): Promise<{ subject: string; difficulty: string; topic: string }> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await singleCallGroq(CLASSIFICATION_SYSTEM_PROMPT, `Classify this question:\n${question}`, apiKey);
      return JSON.parse(result);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.message.includes('429') || lastError.message.includes('5')) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError ?? new Error('Failed after retries');
}

export async function callGroqStepByStepSolution(
  question: string,
  subject: string,
  apiKey: string
): Promise<any> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await singleCallGroq(STEP_BY_STEP_SYSTEM_PROMPT, `Subject: ${subject}\nQuestion: ${question}`, apiKey);
      return JSON.parse(result);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.message.includes('429') || lastError.message.includes('5')) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError ?? new Error('Failed after retries');
}

export async function callGroqCitationGenerator(
  topic: string,
  sourceType: string,
  apiKey: string
): Promise<any> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await singleCallGroq(CITATION_SYSTEM_PROMPT, `Generate citations for a source about "${topic}", type: ${sourceType}`, apiKey);
      return JSON.parse(result);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.message.includes('429') || lastError.message.includes('5')) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError ?? new Error('Failed after retries');
}

export async function callGroqPlagiarismCheck(
  text: string,
  apiKey: string
): Promise<any> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await singleCallGroq(PLAGIARISM_SYSTEM_PROMPT, `Check this text for plagiarism:\n${text}`, apiKey);
      return JSON.parse(result);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.message.includes('429') || lastError.message.includes('5')) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError ?? new Error('Failed after retries');
}

export async function callGroqHomeworkHelper(
  subject: string,
  question: string,
  apiKey: string
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await singleCallGroq(HOMEWORK_SYSTEM_PROMPT, `Subject: ${subject}\nQuestion: ${question}`, apiKey);
      return result;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.message.includes('429') || lastError.message.includes('5')) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError ?? new Error('Failed after retries');
}

async function singleCallGroq(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<string> {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
      response_format: systemPrompt.includes('JSON') ? { type: 'json_object' } : undefined,
    }),
  });

  if (!response.ok) {
    let detail = '';
    try {
      const errorBody = await response.json();
      detail = errorBody?.error?.message ?? response.statusText;
    } catch {
      detail = response.statusText;
    }
    throw new Error(`Groq API responded with ${response.status}: ${detail}`);
  }

  const data = (await response.json()) as GroqAPIResponse;
  const content = data?.choices?.[0]?.message?.content;

  if (!content || content.trim().length === 0) {
    throw new Error('Groq API returned an empty response content');
  }
  return content;
}

const LEARNING_MODULE_SYSTEM_PROMPT = `You are a helpful learning module generator.
Given a topic, generate a structured learning module.
Return ONLY a valid JSON object. No other text.
The JSON should have the following structure:
{
  "title": "Short, catchy title for the module",
  "description": "1-2 sentences about what the learner will achieve",
  "steps": [
    {
      "id": "step_1",
      "type": "lesson",
      "title": "Lesson 1 Title",
      "content": "Detailed content for this lesson",
      "materials": [
        {
          "id": "mat_1",
          "type": "text",
          "title": "Material 1 Title",
          "content": "Material content here"
        }
      ],
      "quiz": null
    },
    {
      "id": "step_2",
      "type": "quiz",
      "title": "Quiz Title",
      "content": "Instructions for the quiz",
      "materials": [],
      "quiz": {
        "id": "quiz_1",
        "type": "multiple_choice",
        "question": "Question text",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": 0,
        "explanation": "Why the correct answer is right"
      }
    }
  ]
}
Rules:
- 4-8 steps total
- Mix of lesson and quiz steps
- Each quiz should test knowledge from the previous lessons
- Keep it engaging and educational
- Return ONLY the JSON, no other text`;

export async function callGroqGenerateLearningModule(
  topic: string,
  apiKey: string
): Promise<{ title: string; description: string; steps: any[] }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await singleCallGenerateLearningModule(topic, apiKey);
      return result;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.message.includes('429') || lastError.message.includes('5')) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError ?? new Error('Failed after retries');
}

async function singleCallGenerateLearningModule(
  topic: string,
  apiKey: string
): Promise<any> {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: LEARNING_MODULE_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Generate a learning module on the topic: "${topic}"`,
        },
      ],
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    let detail = '';
    try {
      const errorBody = await response.json();
      detail = errorBody?.error?.message ?? response.statusText;
    } catch {
      detail = response.statusText;
    }
    throw new Error(`Groq API responded with ${response.status}: ${detail}`);
  }

  const data = (await response.json()) as GroqAPIResponse;
  const content = data?.choices?.[0]?.message?.content;

  if (!content || content.trim().length === 0) {
    throw new Error('Groq API returned an empty response content.');
  }

  return JSON.parse(content);
}

async function singleCallSkillTree(goalTitle: string, apiKey: string): Promise<string> {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Generate a skill tree DAG for the following career goal: "${goalTitle}"`,
        },
      ],
      temperature: 0.15,
      max_tokens: 8192,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    let detail = '';
    try {
      const errorBody = await response.json();
      detail = errorBody?.error?.message ?? response.statusText;
    } catch {
      detail = response.statusText;
    }
    throw new Error(`Groq API responded with ${response.status}: ${detail}`);
  }

  const data = (await response.json()) as GroqAPIResponse;
  const content = data?.choices?.[0]?.message?.content;

  if (!content || content.trim().length === 0) {
    throw new Error('Groq API returned an empty response content.');
  }

  return content;
}

async function singleCallHomeworkHelper(
  subject: string,
  question: string,
  apiKey: string
): Promise<string> {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: HOMEWORK_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Subject: ${subject}\nQuestion: ${question}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    let detail = '';
    try {
      const errorBody = await response.json();
      detail = errorBody?.error?.message ?? response.statusText;
    } catch {
      detail = response.statusText;
    }
    throw new Error(`Groq API responded with ${response.status}: ${detail}`);
  }

  const data = (await response.json()) as GroqAPIResponse;
  const content = data?.choices?.[0]?.message?.content;

  if (!content || content.trim().length === 0) {
    throw new Error('Groq API returned an empty response content.');
  }
  return content;
}

// ─────────────────────────────────────────────────────────────────────────────
// Search Link Generators — replace hallucinated URLs with real links
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate real, working search URLs for a skill node.
 * These are client-side generated and always valid.
 */
export function generateSearchLinks(nodeTitle: string): SearchLink[] {
  const query = encodeURIComponent(`${nodeTitle} tutorial`);
  return [
    {
      platform: 'Google',
      icon: '🔍',
      url: `https://www.google.com/search?q=${query}`,
    },
    {
      platform: 'YouTube',
      icon: '▶️',
      url: `https://www.youtube.com/results?search_query=${query}`,
    },
    {
      platform: 'Coursera',
      icon: '🎓',
      url: `https://www.coursera.org/search?query=${encodeURIComponent(nodeTitle)}`,
    },
  ];
}

export interface SearchLink {
  platform: string;
  icon: string;
  url: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal Types
// ─────────────────────────────────────────────────────────────────────────────

interface GroqAPIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}
