/**
 * SkillGrid — GoalInput Component
 *
 * Premium entry screen with:
 *   - Animated typing placeholder that cycles through examples
 *   - Example goal chips
 *   - BYOK API key configuration with tutorial
 *   - Better error display with retry
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Linking from 'expo-linking';
import { useSkillGridStore } from '../../store/skillTreeStore';
import { Colors, Typography, Radii } from '../../constants/theme';

const EXAMPLE_GOALS = [
  'Quant Trader',
  'ML Engineer',
  'iOS Developer',
  'Game Developer',
  'Cybersecurity Analyst',
  'UX Designer',
  'Data Scientist',
  'Cloud Architect',
  'Blockchain Developer',
  'DevOps Engineer',
];

interface GoalInputProps {
  onGenerated: () => void;
}

export const GoalInput: React.FC<GoalInputProps> = ({ onGenerated }) => {
  const [goal, setGoal] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  const generateSkillTree = useSkillGridStore((s) => s.generateSkillTree);
  const setApiKey = useSkillGridStore((s) => s.setApiKey);
  const apiKey = useSkillGridStore((s) => s.apiKey);
  const isLoading = useSkillGridStore((s) => s.isLoading);
  const error = useSkillGridStore((s) => s.error);

  const btnScale = useSharedValue(1);
  const logoGlow = useSharedValue(0.5);

  // Animated typing placeholder
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx(prev => (prev + 1) % EXAMPLE_GOALS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Logo glow animation
  useEffect(() => {
    logoGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.4, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, []);

  const handleGenerate = useCallback(async () => {
    const trimmed = goal.trim();
    if (!trimmed || isLoading) return;

    if (apiKeyInput.trim()) {
      setApiKey(apiKeyInput.trim());
    }

    btnScale.value = withSpring(0.95, { damping: 10 }, () => {
      btnScale.value = withSpring(1);
    });

    await generateSkillTree(trimmed);
    
    // Only call onGenerated if generation was successful (no error and activeTreeId exists)
    const { error: currentError, activeTreeId } = useSkillGridStore.getState();
    if (!currentError && activeTreeId) {
      onGenerated();
    }
  }, [goal, apiKeyInput, isLoading, generateSkillTree, setApiKey, onGenerated]);

  const handleChip = useCallback((g: string) => setGoal(g), []);

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const logoGlowStyle = useAnimatedStyle(() => ({
    opacity: logoGlow.value,
  }));

  const hasKey = !!(apiKey || apiKeyInput.trim());

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerBlock}>
          <View style={styles.logoRow}>
            <Text style={styles.wordmark}>SKILL</Text>
            <Animated.Text style={[styles.wordmark, styles.wordmarkAccent, logoGlowStyle]}>
              GRID
            </Animated.Text>
          </View>
          <Text style={styles.tagline}>Map your career as an interactive skill tree.</Text>
          <Text style={styles.subtitle}>
            AI-powered learning paths with {'\n'}real-time progress tracking
          </Text>
        </View>

        {/* Goal input */}
        <View style={styles.inputBlock}>
          <Text style={styles.inputLabel}>WHAT DO YOU WANT TO BECOME?</Text>
          <TextInput
            style={styles.textInput}
            placeholder={`e.g. ${EXAMPLE_GOALS[placeholderIdx]}`}
            placeholderTextColor={Colors.textDim}
            value={goal}
            onChangeText={setGoal}
            returnKeyType="done"
            autoCapitalize="words"
            autoCorrect={false}
            selectionColor={Colors.tierFoundation}
          />
        </View>

        {/* Example chips */}
        <View style={styles.chipsContainer}>
          <Text style={styles.chipsLabel}>POPULAR PATHS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipsRow}>
              {EXAMPLE_GOALS.map((g) => (
                <Pressable
                  key={g}
                  style={[styles.chip, goal === g && styles.chipActive]}
                  onPress={() => handleChip(g)}
                >
                  <Text
                    style={[styles.chipText, goal === g && styles.chipTextActive]}
                  >
                    {g}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* API Key toggle */}
        <Pressable
          style={styles.apiKeyToggle}
          onPress={() => setShowApiKey((v) => !v)}
        >
          <View style={[styles.keyDot, { backgroundColor: hasKey ? Colors.success : Colors.textDim }]} />
          <Text style={styles.apiKeyToggleText}>
            {hasKey ? 'API Key configured ✓' : 'Set Groq API Key'}
          </Text>
          <Text style={styles.apiKeyChevron}>{showApiKey ? '▲' : '▼'}</Text>
        </Pressable>

        {showApiKey && (
          <View style={styles.apiKeySection}>
            <TextInput
              style={[styles.textInput, styles.apiKeyInput]}
              placeholder="gsk_..."
              placeholderTextColor={Colors.textDim}
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              selectionColor={Colors.tierFoundation}
            />
            <View style={styles.apiKeyActions}>
              <Pressable onPress={() => Linking.openURL('https://console.groq.com/keys')}>
                <Text style={[styles.apiKeyHint, styles.apiKeyLink]}>
                  Get a free key here
                </Text>
              </Pressable>
              <Pressable onPress={() => setShowTutorial(true)}>
                <Text style={[styles.apiKeyHint, styles.apiKeyTutorial]}>
                  📖 Tutorial
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Tutorial Modal */}
        <Modal
          visible={showTutorial}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowTutorial(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>🔑 API Key Setup Tutorial</Text>
              <ScrollView style={styles.modalScroll}>
                <View style={styles.tutorialStep}>
                  <Text style={styles.tutorialStepNum}>1</Text>
                  <View style={styles.tutorialStepText}>
                    <Text style={styles.tutorialStepTitle}>Go to Groq Console</Text>
                    <Text style={styles.tutorialStepDesc}>
                      Visit{' '}
                      <Text
                        style={styles.tutorialLink}
                        onPress={() => Linking.openURL('https://console.groq.com')}
                      >
                        console.groq.com
                      </Text>{' '}
                      and sign in or create an account (free).
                    </Text>
                  </View>
                </View>
                <View style={styles.tutorialStep}>
                  <Text style={styles.tutorialStepNum}>2</Text>
                  <View style={styles.tutorialStepText}>
                    <Text style={styles.tutorialStepTitle}>Generate Key</Text>
                    <Text style={styles.tutorialStepDesc}>
                      Click "API Keys" → "Create API Key". Name it "SkillGrid" and click "Submit".
                    </Text>
                  </View>
                </View>
                <View style={styles.tutorialStep}>
                  <Text style={styles.tutorialStepNum}>3</Text>
                  <View style={styles.tutorialStepText}>
                    <Text style={styles.tutorialStepTitle}>Copy & Paste</Text>
                    <Text style={styles.tutorialStepDesc}>
                      Copy your key (starts with "gsk_") and paste it in the field above.
                    </Text>
                  </View>
                </View>
                <View style={styles.tutorialStep}>
                  <Text style={styles.tutorialStepNum}>4</Text>
                  <View style={styles.tutorialStepText}>
                    <Text style={styles.tutorialStepTitle}>Security</Text>
                    <Text style={styles.tutorialStepDesc}>
                      Never share your key with anyone. It's stored locally on your device only.
                    </Text>
                  </View>
                </View>
                <View style={styles.tutorialStep}>
                  <Text style={styles.tutorialStepNum}>⚠️</Text>
                  <View style={styles.tutorialStepText}>
                    <Text style={styles.tutorialStepTitle}>Troubleshooting</Text>
                    <Text style={styles.tutorialStepDesc}>
                      If you get errors, check:{'\n'}
                      • Key is pasted correctly (no extra spaces){'\n'}
                      • Key hasn't expired or been revoked in Groq Console
                    </Text>
                  </View>
                </View>
              </ScrollView>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setShowTutorial(false)}
              >
                <Text style={styles.modalCloseBtnText}>Got It!</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>⚠ {error.message}</Text>
            {error.detail && (
              <Text style={styles.errorDetail} numberOfLines={3}>
                {error.detail}
              </Text>
            )}
            {error.canRegenerate && (
              <Pressable style={styles.retryBtn} onPress={handleGenerate}>
                <Text style={styles.retryBtnText}>↻ Try Again</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Generate button */}
        <Animated.View style={btnStyle}>
          <Pressable
            style={[
              styles.generateBtn,
              (!goal.trim() || isLoading) && styles.generateBtnDisabled,
            ]}
            onPress={handleGenerate}
            disabled={!goal.trim() || isLoading}
          >
            <Text style={styles.generateBtnText}>
              {isLoading ? '⏳  Generating…' : '✦  Generate Skill Tree'}
            </Text>
          </Pressable>
        </Animated.View>

        <Text style={styles.poweredBy}>Powered by Groq / Llama 3.3 · 70B</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 64,
  },
  headerBlock: {
    marginBottom: 32,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginBottom: 8,
  },
  wordmark: {
    fontSize: 42,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -1.5,
  },
  wordmarkAccent: {
    color: Colors.tierFoundation,
  },
  tagline: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textDim,
    lineHeight: 16,
  },
  inputBlock: { marginBottom: 16 },
  inputLabel: {
    ...Typography.small,
    color: Colors.textDim,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  chipsContainer: {
    marginBottom: 24,
  },
  chipsLabel: {
    ...Typography.small,
    color: Colors.textDim,
    letterSpacing: 1,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 24,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    borderColor: Colors.tierFoundation,
    backgroundColor: `${Colors.tierFoundation}15`,
  },
  chipText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.tierFoundation,
    fontWeight: '700',
  },
  apiKeyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingVertical: 4,
  },
  keyDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  apiKeyToggleText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
  },
  apiKeyChevron: {
    color: Colors.textDim,
    fontSize: 10,
  },
  apiKeySection: {
    marginBottom: 16,
  },
  apiKeyInput: {
    fontSize: 13,
    marginBottom: 8,
  },
  apiKeyActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  apiKeyHint: {
    ...Typography.small,
    color: Colors.textDim,
    paddingLeft: 4,
  },
  apiKeyLink: {
    color: Colors.tierFoundation,
    textDecorationLine: 'underline',
  },
  apiKeyTutorial: {
    color: Colors.tierElite,
  },
  errorBox: {
    backgroundColor: '#1A0A0E',
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.error,
    padding: 14,
    marginBottom: 16,
  },
  errorTitle: {
    color: '#FF6666',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 4,
  },
  errorDetail: {
    color: '#AA5555',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: `${Colors.error}22`,
    borderRadius: Radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: `${Colors.error}44`,
  },
  retryBtnText: {
    ...Typography.caption,
    color: Colors.error,
    fontWeight: '700',
  },
  generateBtn: {
    backgroundColor: Colors.tierFoundation,
    borderRadius: Radii.lg,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: Colors.tierFoundation,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 24,
    shadowOpacity: 0.5,
    elevation: 8,
  },
  generateBtnDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
  },
  generateBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  poweredBy: {
    ...Typography.small,
    color: Colors.textDim,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surfaceRaised,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalTitle: {
    ...Typography.heading,
    color: Colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalScroll: {
    marginBottom: 16,
  },
  tutorialStep: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  tutorialStepNum: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${Colors.tierFoundation}20`,
    color: Colors.tierFoundation,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 16,
    fontWeight: '800',
    overflow: 'hidden',
  },
  tutorialStepText: {
    flex: 1,
  },
  tutorialStepTitle: {
    ...Typography.subheading,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  tutorialStepDesc: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  tutorialLink: {
    color: Colors.tierFoundation,
    textDecorationLine: 'underline',
  },
  modalCloseBtn: {
    backgroundColor: Colors.tierFoundation,
    borderRadius: Radii.lg,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
});
