import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSkillGridStore } from '../src/store/skillTreeStore';
import { Colors, Typography, Radii } from '../src/constants/theme';
import {
  callGroqHomeworkHelper,
  callGroqClassifyHomework,
  callGroqStepByStepSolution,
  callGroqCitationGenerator,
  callGroqPlagiarismCheck,
} from '../src/api/groq';
import type { HomeworkSubject, DifficultyLevel, StepSolution, Citation, Recommendation } from '../src/types';

const SUBJECTS: HomeworkSubject[] = ['Math', 'Science', 'English', 'History', 'Programming', 'Other'];
const DIFFICULTIES: DifficultyLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const CITATION_TYPES = ['APA', 'MLA', 'Chicago', 'Harvard'];

export default function HomeworkScreen() {
  const {
    apiKey,
    homeworkSessions,
    addHomeworkSession,
    deleteHomeworkSession,
    performanceRecords,
    recommendations,
    updateRecommendations,
  } = useSkillGridStore();

  const [activeTab, setActiveTab] = useState<'helper' | 'plagiarism' | 'citations'>('helper');

  // Helper tab state
  const [question, setQuestion] = useState('');
  const [subject, setSubject] = useState<HomeworkSubject>('Other');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Beginner');
  const [autoClassify, setAutoClassify] = useState(true);
  const [loading, setLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);

  // Plagiarism tab state
  const [plagiarismText, setPlagiarismText] = useState('');
  const [plagiarismResult, setPlagiarismResult] = useState<any>(null);
  const [plagiarismLoading, setPlagiarismLoading] = useState(false);

  // Citation tab state
  const [citationTopic, setCitationTopic] = useState('');
  const [citationSourceType, setCitationSourceType] = useState('Website');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [citationLoading, setCitationLoading] = useState(false);

  const getResolvedKey = () => {
    return (
      apiKey ??
      (typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_GROQ_API_KEY : undefined) ??
      ''
    );
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    const resolvedKey = getResolvedKey();
    if (!resolvedKey) {
      alert('Please set your Groq API key in the Goal Input screen first!');
      return;
    }

    setLoading(true);
    try {
      // Auto classify
      let finalSubject = subject;
      let finalDifficulty = difficulty;
      let finalTopic = 'General';
      if (autoClassify) {
        const classification = await callGroqClassifyHomework(question, resolvedKey);
        finalSubject = classification.subject as HomeworkSubject;
        finalDifficulty = classification.difficulty as DifficultyLevel;
        finalTopic = classification.topic;
      }

      // Get step by step solution
      const solutionData = await callGroqStepByStepSolution(question, finalSubject, resolvedKey);
      const answerText = solutionData.answer || '';
      const steps: StepSolution[] = solutionData.steps || [];
      const resources = solutionData.resources || [];

      // Generate fake citations for now
      const fakeCitations: Citation[] = [
        { id: '1', type: 'APA', content: 'Doe, J. (2023). *Learning Made Easy*. Publisher.' },
        { id: '2', type: 'MLA', content: 'Doe, John. *Learning Made Easy*. Publisher, 2023.' },
      ];

      // Create new session
      const newSession = {
        subject: finalSubject,
        difficulty: finalDifficulty,
        question,
        answer: answerText,
        steps,
        citations: fakeCitations,
      };
      addHomeworkSession(newSession);
      setCurrentSession({ ...newSession, resources });

      // Generate recommendations
      const recs: Recommendation[] = [
        {
          id: 'rec-1',
          title: `Practice ${finalTopic}`,
          description: 'Strengthen your understanding with more exercises',
          type: 'practice',
        },
        {
          id: 'rec-2',
          title: `Watch a video about ${finalTopic}`,
          description: 'Visual learners might find this helpful',
          type: 'video',
        },
      ];
      updateRecommendations(recs);
    } catch (err) {
      console.error(err);
      alert('Sorry, something went wrong. Please check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckPlagiarism = async () => {
    if (!plagiarismText.trim()) return;
    const resolvedKey = getResolvedKey();
    if (!resolvedKey) {
      alert('Please set your Groq API key first!');
      return;
    }
    setPlagiarismLoading(true);
    try {
      const result = await callGroqPlagiarismCheck(plagiarismText, resolvedKey);
      setPlagiarismResult(result);
    } catch (err) {
      console.error(err);
      alert('Sorry, plagiarism check failed');
    } finally {
      setPlagiarismLoading(false);
    }
  };

  const handleGenerateCitations = async () => {
    if (!citationTopic.trim()) return;
    const resolvedKey = getResolvedKey();
    if (!resolvedKey) {
      alert('Please set your Groq API key first!');
      return;
    }
    setCitationLoading(true);
    try {
      const result = await callGroqCitationGenerator(citationTopic, citationSourceType, resolvedKey);
      setCitations(result.citations);
    } catch (err) {
      console.error(err);
      alert('Sorry, citation generation failed');
    } finally {
      setCitationLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Homework Helper</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'helper' && styles.tabActive]}
          onPress={() => setActiveTab('helper')}
        >
          <Text style={[styles.tabText, activeTab === 'helper' && styles.tabTextActive]}>Helper</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'plagiarism' && styles.tabActive]}
          onPress={() => setActiveTab('plagiarism')}
        >
          <Text style={[styles.tabText, activeTab === 'plagiarism' && styles.tabTextActive]}>Plagiarism</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'citations' && styles.tabActive]}
          onPress={() => setActiveTab('citations')}
        >
          <Text style={[styles.tabText, activeTab === 'citations' && styles.tabTextActive]}>Citations</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'helper' && (
          <View style={styles.tabContent}>
            {/* Input Area */}
            <View style={styles.inputSection}>
              <View style={styles.autoClassifyRow}>
                <Pressable
                  style={styles.checkbox}
                  onPress={() => setAutoClassify(!autoClassify)}
                >
                  <Text style={styles.checkboxText}>{autoClassify ? '☑' : '☐'}</Text>
                </Pressable>
                <Text style={styles.autoClassifyText}>Auto-classify subject & difficulty</Text>
              </View>

              {!autoClassify && (
                <>
                  <Text style={styles.sectionLabel}>Subject</Text>
                  <ScrollView horizontal style={styles.subjectsRow} showsHorizontalScrollIndicator={false}>
                    {SUBJECTS.map((s) => (
                      <Pressable
                        key={s}
                        style={[styles.subjectChip, subject === s && styles.subjectChipActive]}
                        onPress={() => setSubject(s)}
                      >
                        <Text style={[styles.subjectChipText, subject === s && styles.subjectChipTextActive]}>
                          {s}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Text style={styles.sectionLabel}>Difficulty</Text>
                  <ScrollView horizontal style={styles.subjectsRow} showsHorizontalScrollIndicator={false}>
                    {DIFFICULTIES.map((d) => (
                      <Pressable
                        key={d}
                        style={[styles.subjectChip, difficulty === d && styles.subjectChipActive]}
                        onPress={() => setDifficulty(d)}
                      >
                        <Text style={[styles.subjectChipText, difficulty === d && styles.subjectChipTextActive]}>
                          {d}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              )}

              <Text style={styles.sectionLabel}>Your Question</Text>
              <TextInput
                style={styles.questionInput}
                placeholder="Ask a question about your homework..."
                placeholderTextColor={Colors.textDim}
                value={question}
                onChangeText={setQuestion}
                multiline
                numberOfLines={6}
              />
              <Pressable
                style={[styles.askBtn, (!question.trim() || loading) && styles.askBtnDisabled]}
                onPress={handleAsk}
                disabled={!question.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.askBtnText}>Ask for Help</Text>
                )}
              </Pressable>
            </View>

            {/* Result Area */}
            {currentSession && (
              <View style={styles.resultSection}>
                <Text style={styles.sectionLabel}>Step-by-Step Solution</Text>
                {currentSession.steps.map((step: StepSolution) => (
                  <View key={step.id} style={styles.stepCard}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepContent}>{step.content}</Text>
                  </View>
                ))}
                {currentSession.resources && currentSession.resources.length > 0 && (
                  <View style={styles.resourcesSection}>
                    <Text style={styles.sectionLabel}>Recommended Resources</Text>
                    {currentSession.resources.map((res: string, idx: number) => (
                      <View key={idx} style={styles.resourceCard}>
                        <Text style={styles.resourceText}>🔗 {res}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <View style={styles.recommendationsSection}>
                <Text style={styles.sectionLabel}>Personalized Recommendations</Text>
                {recommendations.map((rec: Recommendation) => (
                  <View key={rec.id} style={styles.recommendationCard}>
                    <Text style={styles.recTitle}>
                      {rec.type === 'lesson' ? '📖' : rec.type === 'video' ? '🎥' : '✏️'} {rec.title}
                    </Text>
                    <Text style={styles.recDesc}>{rec.description}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* History */}
            {homeworkSessions.length > 0 && (
              <View style={styles.historySection}>
                <Text style={styles.sectionLabel}>Recent Questions</Text>
                {homeworkSessions.map((session) => (
                  <View key={session.id} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <View style={styles.historySubjectRow}>
                        <Text style={styles.historySubject}>{session.subject}</Text>
                        <Text style={styles.historyDifficulty}>{session.difficulty}</Text>
                      </View>
                      <Pressable onPress={() => deleteHomeworkSession(session.id)}>
                        <Text style={styles.deleteText}>✕</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.historyQuestion} numberOfLines={3}>
                      {session.question}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'plagiarism' && (
          <View style={styles.tabContent}>
            <Text style={styles.headerSubtitle}>Check your work for originality</Text>
            <TextInput
              style={styles.largeInput}
              placeholder="Paste your text here to check for plagiarism..."
              placeholderTextColor={Colors.textDim}
              value={plagiarismText}
              onChangeText={setPlagiarismText}
              multiline
              numberOfLines={10}
            />
            <Pressable
              style={[styles.actionBtn, (!plagiarismText.trim() || plagiarismLoading) && styles.actionBtnDisabled]}
              onPress={handleCheckPlagiarism}
              disabled={!plagiarismText.trim() || plagiarismLoading}
            >
              {plagiarismLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.actionBtnText}>Check Plagiarism</Text>
              )}
            </Pressable>

            {plagiarismResult && (
              <View style={styles.plagiarismResult}>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Originality Score</Text>
                  <Text style={[styles.scoreValue, { color: Colors.tierFoundation }]}>
                    {plagiarismResult.originalityScore}%
                  </Text>
                </View>
                <Text style={styles.resultFindings}>{plagiarismResult.findings}</Text>
                
                {plagiarismResult.contextAwareAnalysis && (
                  <View style={styles.analysisSection}>
                    <Text style={styles.sectionLabel}>Context-Aware Analysis</Text>
                    <Text style={styles.analysisText}>{plagiarismResult.contextAwareAnalysis}</Text>
                  </View>
                )}
                
                {plagiarismResult.suggestions && plagiarismResult.suggestions.length > 0 && (
                  <View style={styles.suggestionsSection}>
                    <Text style={styles.sectionLabel}>Suggestions</Text>
                    {plagiarismResult.suggestions.map((suggestion: string, idx: number) => (
                      <View key={idx} style={styles.suggestion}>
                        <Text style={styles.suggestionText}>• {suggestion}</Text>
                      </View>
                    ))}
                  </View>
                )}
                
                {plagiarismResult.recommendedSources && plagiarismResult.recommendedSources.length > 0 && (
                  <View style={styles.sourcesSection}>
                    <Text style={styles.sectionLabel}>Recommended Sources</Text>
                    {plagiarismResult.recommendedSources.map((source: any, idx: number) => (
                      <View key={idx} style={styles.sourceCard}>
                        <Text style={styles.sourceTitle}>{source.title}</Text>
                        <Text style={styles.sourceType}>{source.type}</Text>
                        <Text style={styles.sourceReason}>{source.reason}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {activeTab === 'citations' && (
          <View style={styles.tabContent}>
            <Text style={styles.headerSubtitle}>Generate citations in multiple formats</Text>
            <Text style={styles.sectionLabel}>Topic</Text>
            <TextInput
              style={styles.questionInput}
              placeholder="What is your paper about?"
              placeholderTextColor={Colors.textDim}
              value={citationTopic}
              onChangeText={setCitationTopic}
            />
            <Text style={styles.sectionLabel}>Source Type</Text>
            <ScrollView horizontal style={styles.subjectsRow} showsHorizontalScrollIndicator={false}>
              {['Website', 'Book', 'Journal Article', 'Video', 'Other'].map((type) => (
                <Pressable
                  key={type}
                  style={[styles.subjectChip, citationSourceType === type && styles.subjectChipActive]}
                  onPress={() => setCitationSourceType(type)}
                >
                  <Text style={[styles.subjectChipText, citationSourceType === type && styles.subjectChipTextActive]}>
                    {type}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={[styles.actionBtn, (!citationTopic.trim() || citationLoading) && styles.actionBtnDisabled]}
              onPress={handleGenerateCitations}
              disabled={!citationTopic.trim() || citationLoading}
            >
              {citationLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.actionBtnText}>Generate Citations</Text>
              )}
            </Pressable>
            {citations.length > 0 && (
              <View style={styles.citationsSection}>
                <Text style={styles.sectionLabel}>Generated Citations</Text>
                {citations.map((citation) => (
                  <View key={citation.id} style={styles.citationCard}>
                    <Text style={styles.citationType}>{citation.type}</Text>
                    <Text style={styles.citationText}>{citation.content}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  headerTitle: {
    ...Typography.heading,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 4,
    marginBottom: 16,
    marginHorizontal: 20,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radii.md,
  },
  tabActive: {
    backgroundColor: Colors.tierFoundation + '20',
  },
  tabText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.tierFoundation,
  },
  tabContent: {
    gap: 16,
  },
  inputSection: {
    gap: 12,
  },
  autoClassifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxText: {
    fontSize: 16,
    color: Colors.tierFoundation,
  },
  autoClassifyText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  sectionLabel: {
    ...Typography.caption,
    color: Colors.textDim,
    letterSpacing: 1,
    marginBottom: 8,
  },
  subjectsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  subjectChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  subjectChipActive: {
    borderColor: Colors.tierFoundation,
    backgroundColor: `${Colors.tierFoundation}15`,
  },
  subjectChipText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  subjectChipTextActive: {
    color: Colors.tierFoundation,
    fontWeight: '700',
  },
  questionInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    color: Colors.textPrimary,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  largeInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    color: Colors.textPrimary,
    fontSize: 16,
    minHeight: 200,
    textAlignVertical: 'top',
  },
  askBtn: {
    backgroundColor: Colors.tierFoundation,
    borderRadius: Radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  askBtnDisabled: {
    opacity: 0.5,
  },
  askBtnText: {
    ...Typography.subheading,
    color: '#000',
    fontWeight: '800',
  },
  actionBtn: {
    backgroundColor: Colors.tierFoundation,
    borderRadius: Radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    ...Typography.subheading,
    color: '#000',
    fontWeight: '800',
  },
  resultSection: {
    gap: 16,
  },
  stepCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  stepTitle: {
    ...Typography.subheading,
    color: Colors.tierFoundation,
    marginBottom: 8,
  },
  stepContent: {
    ...Typography.body,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  resourcesSection: {
    marginTop: 20,
  },
  resourceCard: {
    backgroundColor: `${Colors.tierIntermediate}15`,
    borderRadius: Radii.md,
    padding: 12,
    marginBottom: 8,
  },
  resourceText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  recommendationsSection: {
    marginTop: 20,
  },
  recommendationCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: 10,
  },
  recTitle: {
    ...Typography.subheading,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  recDesc: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  historySection: {
    marginTop: 20,
    gap: 12,
  },
  historyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historySubjectRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  historySubject: {
    ...Typography.caption,
    color: Colors.tierFoundation,
    fontWeight: '700',
  },
  historyDifficulty: {
    ...Typography.caption,
    color: Colors.textDim,
  },
  deleteText: {
    color: Colors.error,
    fontSize: 18,
    fontWeight: '600',
  },
  historyQuestion: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: 8,
    fontWeight: '600',
  },
  plagiarismResult: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreLabel: {
    ...Typography.subheading,
    color: Colors.textPrimary,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  resultFindings: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  suggestionsSection: {
    marginTop: 8,
  },
  suggestion: {
    marginBottom: 4,
  },
  suggestionText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  analysisSection: {
    marginTop: 12,
  },
  analysisText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  sourcesSection: {
    marginTop: 12,
    gap: 8,
  },
  sourceCard: {
    backgroundColor: `${Colors.tierIntermediate}10`,
    borderRadius: Radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  sourceTitle: {
    ...Typography.subheading,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sourceType: {
    ...Typography.caption,
    color: Colors.tierFoundation,
    fontWeight: '600',
    marginBottom: 4,
  },
  sourceReason: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  citationsSection: {
    gap: 12,
  },
  citationCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  citationType: {
    ...Typography.caption,
    color: Colors.tierFoundation,
    fontWeight: '700',
    marginBottom: 6,
  },
  citationText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
});
