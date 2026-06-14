import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSkillGridStore } from '../src/store/skillTreeStore';
import { Colors, Typography, Radii } from '../src/constants/theme';
import type { SchoolSubject, LearningModule, LearningStep } from '../src/types';

const SUBJECT_ICONS: Record<SchoolSubject, string> = {
  math: '📐',
  science: '🔬',
  english: '📚',
  history: '🏛️',
  programming: '💻',
  art: '🎨',
  music: '🎵',
  other: '📖',
};

const SUBJECT_COLORS: Record<SchoolSubject, string> = {
  math: Colors.tierFoundation,
  science: Colors.tierIntermediate,
  english: Colors.tierAdvanced,
  history: Colors.tierElite,
  programming: Colors.tierFoundation,
  art: Colors.tierIntermediate,
  music: Colors.tierElite,
  other: Colors.textDim,
};

export default function LearnScreen() {
  const {
    learningModules,
    completeLearningStep,
    addNote,
    updateNote,
    deleteNote,
    notes,
    generateCustomLearningModule,
    deleteLearningModule,
  } = useSkillGridStore();
  const [activeModule, setActiveModuleLocal] = useState<LearningModule | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleModulePress = (module: LearningModule) => {
    setActiveModuleLocal(module);
    setCurrentStepIndex(0);
    setSelectedQuizOption(null);
    setQuizCompleted(false);
    const moduleNotes = notes.filter(n => n.moduleId === module.id);
    if (moduleNotes.length > 0) {
      setNoteText(moduleNotes[0].content);
    } else {
      setNoteText('');
    }
  };

  const handleBackToModules = () => {
    setActiveModuleLocal(null);
  };

  const handleNextStep = () => {
    if (!activeModule) return;
    const currentStep = activeModule.steps[currentStepIndex];
    completeLearningStep(activeModule.id, currentStep.id);
    if (currentStepIndex < activeModule.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      setSelectedQuizOption(null);
      setQuizCompleted(false);
    }
  };

  const handleGenerateModule = async () => {
    if (!customTopic.trim()) return;
    try {
      setIsGenerating(true);
      await generateCustomLearningModule(customTopic.trim());
      setCustomTopic('');
      Alert.alert('Success!', 'Custom module created!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to generate module');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteModule = (id: string) => {
    Alert.alert('Delete Module', 'Are you sure you want to delete this module?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteLearningModule(id) }
    ]);
  };

  const handleSaveNote = () => {
    if (!activeModule) return;
    const currentStep = activeModule.steps[currentStepIndex];
    const existingNote = notes.find(n => n.moduleId === activeModule.id && n.stepId === currentStep.id);
    if (existingNote) {
      updateNote(existingNote.id, noteText);
    } else {
      addNote(activeModule.id, currentStep.id, noteText);
    }
    Alert.alert('Saved!', 'Your note has been saved');
  };

  if (activeModule) {
    const currentStep = activeModule.steps[currentStepIndex];
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleBackToModules}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{activeModule.title}</Text>
        </View>
        <ScrollView style={styles.stepContent}>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {currentStepIndex + 1} of {activeModule.steps.length}
            </Text>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill,
                {
                  width: `${activeModule.progress}%`,
                  backgroundColor: SUBJECT_COLORS[activeModule.subject],
                }
              ]} />
            </View>
          </View>
          <View style={styles.stepCard}>
            <Text style={styles.stepType}>{currentStep.type.toUpperCase()}</Text>
            <Text style={styles.stepTitle}>{currentStep.title}</Text>
            <Text style={styles.stepContentText}>{currentStep.content}</Text>
            {currentStep.materials.length > 0 && (
              <View style={styles.materialsContainer}>
                {currentStep.materials.map(material => (
                <View key={material.id} style={styles.materialItem}>
                  <Text style={styles.materialTitle}>{material.title}</Text>
                  <Text style={styles.materialContent}>{material.content}</Text>
                </View>
              ))}
              </View>
            )}
            {currentStep.type === 'quiz' && currentStep.quiz && (
              <View style={styles.quizContainer}>
                <Text style={styles.quizQuestion}>{currentStep.quiz.question}</Text>
                {currentStep.quiz.options.map((option, idx) => {
                  const isCorrect = quizCompleted && idx === currentStep.quiz?.correctAnswer;
                  const isWrong = quizCompleted && selectedQuizOption === idx && idx !== currentStep.quiz?.correctAnswer;
                  return (
                    <Pressable
                      key={idx}
                      style={[
                        styles.quizOption,
                        selectedQuizOption === idx && styles.quizOptionSelected,
                        isCorrect && styles.quizOptionCorrect,
                        isWrong && styles.quizOptionWrong,
                      ]}
                      onPress={() => {
                        if (!quizCompleted) {
                          setSelectedQuizOption(idx);
                        }
                      }}
                      disabled={quizCompleted}
                    >
                      <Text style={styles.quizOptionText}>{option}</Text>
                    </Pressable>
                  );
                })}
                {quizCompleted && (
                  <View style={styles.explanation}>
                    <Text style={styles.explanationText}>{currentStep.quiz.explanation}</Text>
                  </View>
                )}
                {selectedQuizOption !== null && !quizCompleted && (
                  <Pressable
                    style={styles.checkAnswerButton}
                    onPress={() => setQuizCompleted(true)}
                  >
                    <Text style={styles.checkAnswerButtonText}>Check Answer</Text>
                  </Pressable>
                )}
              </View>
            )}
            <View style={styles.noteContainer}>
              <Text style={styles.noteTitle}>Your Notes</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="Add your notes here..."
                placeholderTextColor={Colors.textDim}
                value={noteText}
                onChangeText={setNoteText}
                multiline
              />
              <Pressable style={styles.saveNoteButton} onPress={handleSaveNote}>
                <Text style={styles.saveNoteButtonText}>Save Note</Text>
              </Pressable>
            </View>
          </View>
          <Pressable style={styles.nextButton} onPress={handleNextStep}>
            <Text style={styles.nextButtonText}>
              {currentStepIndex === activeModule.steps.length - 1 ? 'Complete!' : 'Next Step'}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Learning Mode</Text>
        <Text style={styles.headerSubtitle}>
          Learn new subjects with structured lessons, quizzes, and practice!
        </Text>
        <View style={styles.customModuleSection}>
          <Text style={styles.customModuleLabel}>Create Custom Module</Text>
          <TextInput
            style={styles.customModuleInput}
            placeholder="What do you want to learn? (e.g., Quantum Computing)"
            placeholderTextColor={Colors.textDim}
            value={customTopic}
            onChangeText={setCustomTopic}
            autoCapitalize="words"
          />
          <Pressable
            style={[
              styles.generateModuleButton,
              (!customTopic.trim() || isGenerating) && styles.generateModuleButtonDisabled,
            ]}
            onPress={handleGenerateModule}
            disabled={!customTopic.trim() || isGenerating}
          >
            <Text style={styles.generateModuleButtonText}>
              {isGenerating ? 'Generating...' : 'Generate Custom Module'}
            </Text>
          </Pressable>
        </View>
        <View style={styles.modulesList}>
          {learningModules.map(module => (
            <View key={module.id} style={styles.moduleCardWrapper}>
              <Pressable
                style={[
                  styles.moduleCard,
                  module.completed && styles.moduleCardCompleted,
                ]}
                onPress={() => handleModulePress(module)}
              >
                <View style={styles.module}>
                  <View style={[
                    styles.moduleIconCircle,
                    { borderColor: SUBJECT_COLORS[module.subject] },
                  ]}>
                    <Text style={styles.moduleIconEmoji}>
                      {SUBJECT_ICONS[module.subject]}
                    </Text>
                  </View>
                  <View style={styles.moduleInfo}>
                    <Text style={styles.moduleTitleText}>{module.title}</Text>
                    <Text style={styles.moduleDesc}>{module.description}</Text>
                    <View style={styles.moduleProgressRow}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${module.progress}%`,
                              backgroundColor: SUBJECT_COLORS[module.subject],
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressText}>{module.progress}%</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
              <Pressable
                style={styles.deleteModuleButton}
                onPress={() => handleDeleteModule(module.id)}
              >
                <Text style={styles.deleteModuleButtonText}>🗑️</Text>
              </Pressable>
            </View>
          ))}
        </View>
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
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  backButtonText: {
    ...Typography.body,
    color: Colors.tierFoundation,
    fontWeight: '600',
    fontSize: 15,
  },
  headerTitle: {
    ...Typography.heading,
    color: Colors.textPrimary,
    flex: 1,
    fontSize: 22,
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: 16,
    fontSize: 15,
  },
  customModuleSection: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: 16,
  },
  customModuleLabel: {
    ...Typography.small,
    color: Colors.textDim,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  customModuleInput: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 15,
    marginBottom: 12,
  },
  generateModuleButton: {
    backgroundColor: Colors.tierFoundation,
    borderRadius: Radii.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  generateModuleButtonDisabled: {
    opacity: 0.4,
  },
  generateModuleButtonText: {
    ...Typography.subheading,
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
  modulesList: {
    gap: 12,
  },
  moduleCardWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteModuleButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  deleteModuleButtonText: {
    fontSize: 16,
  },
  moduleCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    flex: 1,
  },
  moduleCardCompleted: {
    borderColor: Colors.tierIntermediate,
    backgroundColor: `${Colors.tierIntermediate}10`,
  },
  module: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  moduleIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  moduleIconEmoji: {
    fontSize: 20,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitleText: {
    ...Typography.subheading,
    color: Colors.textPrimary,
    marginBottom: 2,
    fontSize: 16,
  },
  moduleDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 8,
    fontSize: 13,
  },
  moduleProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 5,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  progressText: {
    ...Typography.caption,
    color: Colors.textDim,
    fontWeight: '700',
    fontSize: 12,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stepCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: 16,
  },
  stepType: {
    ...Typography.small,
    color: Colors.tierFoundation,
    letterSpacing: 0.8,
    marginBottom: 10,
    fontSize: 12,
  },
  stepTitle: {
    ...Typography.heading,
    color: Colors.textPrimary,
    marginBottom: 10,
    fontSize: 20,
  },
  stepContentText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
    fontSize: 15,
  },
  materialsContainer: {
    marginBottom: 16,
    gap: 10,
  },
  materialItem: {
    backgroundColor: Colors.surfaceElevated,
    padding: 12,
    borderRadius: Radii.md,
  },
  materialTitle: {
    ...Typography.caption,
    color: Colors.tierFoundation,
    fontWeight: '600',
    marginBottom: 6,
    fontSize: 13,
  },
  materialContent: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  quizContainer: {
    marginBottom: 16,
  },
  quizQuestion: {
    ...Typography.heading,
    color: Colors.textPrimary,
    fontSize: 17,
    marginBottom: 12,
    lineHeight: 24,
  },
  quizOption: {
    backgroundColor: Colors.surfaceElevated,
    padding: 12,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: 10,
  },
  quizOptionSelected: {
    borderColor: Colors.tierFoundation,
    backgroundColor: `${Colors.tierFoundation}10`,
  },
  quizOptionCorrect: {
    borderColor: Colors.tierIntermediate,
    backgroundColor: `${Colors.tierIntermediate}20`,
  },
  quizOptionWrong: {
    borderColor: Colors.error,
    backgroundColor: `${Colors.error}10`,
  },
  quizOptionText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  explanation: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  explanationText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontSize: 14,
  },
  checkAnswerButton: {
    backgroundColor: Colors.tierFoundation,
    borderRadius: Radii.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  checkAnswerButtonText: {
    ...Typography.subheading,
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
  noteContainer: {
    marginTop: 16,
  },
  noteTitle: {
    ...Typography.subheading,
    color: Colors.textPrimary,
    marginBottom: 10,
    fontSize: 17,
  },
  noteInput: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  saveNoteButton: {
    backgroundColor: Colors.tierAdvanced,
    borderRadius: Radii.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveNoteButtonText: {
    ...Typography.subheading,
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
  },
  nextButton: {
    backgroundColor: Colors.tierFoundation,
    borderRadius: Radii.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  nextButtonText: {
    ...Typography.subheading,
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
});
