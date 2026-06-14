import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSkillGridStore } from '../src/store/skillTreeStore';
import { Colors, Typography, Radii, getRankByXP } from '../src/constants/theme';
import type { LearningGoal, PortfolioItem } from '../src/types';

export default function ProfileScreen() {
  const {
    profile,
    achievements,
    updateProfile,
    addLearningGoal,
    updateLearningGoal,
    deleteLearningGoal,
    addPortfolioItem,
    deletePortfolioItem,
  } = useSkillGridStore();

  // Profile editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(profile.displayName);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState(profile.bio);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Learning Goal state
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTargetXp, setNewGoalTargetXp] = useState('100');

  // Portfolio state
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);
  const [newPortfolioTitle, setNewPortfolioTitle] = useState('');
  const [newPortfolioDesc, setNewPortfolioDesc] = useState('');
  const [newPortfolioType, setNewPortfolioType] = useState<'skill' | 'tree' | 'module'>('skill');

  const emojiOptions = ['🧑‍💻', '👩‍🎓', '🧑‍🔬', '👨‍🎨', '🧑‍🎤', '🦸', '🐱', '🐶', '🦊', '🐼'];
  const rank = getRankByXP(profile.totalXp);

  // Calculate progress to next rank
  const xpThresholds = [
    { minXp: 0, title: 'Novice', color: Colors.textDim },
    { minXp: 50, title: 'Apprentice', color: Colors.tierFoundation },
    { minXp: 150, title: 'Adept', color: Colors.tierFoundation },
    { minXp: 400, title: 'Journeyman', color: Colors.tierIntermediate },
    { minXp: 1000, title: 'Expert', color: Colors.tierAdvanced },
    { minXp: 2500, title: 'Master', color: Colors.tierAdvanced },
    { minXp: 6000, title: 'Grandmaster', color: Colors.tierElite },
    { minXp: 15000, title: 'Ascended', color: Colors.tierElite },
  ];

  let currentIndex = 0;
  for (let i = 0; i < xpThresholds.length; i++) {
    if (profile.totalXp >= xpThresholds[i].minXp) {
      currentIndex = i;
    }
  }

  const isMaxRank = currentIndex === xpThresholds.length - 1;
  let progressPercent = 100;
  let nextRankTitle = xpThresholds[currentIndex].title;
  let progressColor = xpThresholds[currentIndex].color;

  if (!isMaxRank) {
    const nextThreshold = xpThresholds[currentIndex + 1];
    nextRankTitle = nextThreshold.title;
    progressColor = nextThreshold.color;
    const currentMin = xpThresholds[currentIndex].minXp;
    const nextMin = nextThreshold.minXp;
    progressPercent = Math.round(((profile.totalXp - currentMin) / (nextMin - currentMin)) * 100);
    progressPercent = Math.max(0, Math.min(100, progressPercent));
  }

  // Handlers
  const handleSaveName = () => {
    updateProfile({ displayName: tempName });
    setIsEditingName(false);
  };

  const handleSaveBio = () => {
    updateProfile({ bio: tempBio });
    setIsEditingBio(false);
  };

  const handleAddGoal = () => {
    if (!newGoalTitle.trim()) return;
    const targetXp = parseInt(newGoalTargetXp) || 100;
    addLearningGoal({ title: newGoalTitle.trim(), targetXp });
    setNewGoalTitle('');
    setNewGoalTargetXp('100');
    setShowAddGoal(false);
  };

  const handleAddPortfolio = () => {
    if (!newPortfolioTitle.trim()) return;
    addPortfolioItem({
      title: newPortfolioTitle.trim(),
      description: newPortfolioDesc.trim(),
      type: newPortfolioType,
      xpEarned: 50, // Default
    });
    setNewPortfolioTitle('');
    setNewPortfolioDesc('');
    setShowAddPortfolio(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Your Profile</Text>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <Pressable onPress={() => setShowEmojiPicker(!showEmojiPicker)}>
              <Text style={styles.avatarEmoji}>{profile.avatarEmoji}</Text>
            </Pressable>
            <View style={styles.avatarRankBadge}>
              <Text style={styles.avatarRankIcon}>{rank.icon}</Text>
            </View>
          </View>

          {showEmojiPicker && (
            <View style={styles.emojiPicker}>
              {emojiOptions.map((emoji) => (
                <Pressable
                  key={emoji}
                  style={styles.emojiOption}
                  onPress={() => {
                    updateProfile({ avatarEmoji: emoji });
                    setShowEmojiPicker(false);
                  }}
                >
                  <Text style={styles.emojiOptionText}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.nameSection}>
            {isEditingName ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.nameInput}
                  value={tempName}
                  onChangeText={setTempName}
                  autoFocus
                />
                <Pressable style={styles.saveBtn} onPress={handleSaveName}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.nameRow} onPress={() => setIsEditingName(true)}>
                <Text style={styles.nameText}>{profile.displayName}</Text>
                <Text style={styles.editIcon}>✏️</Text>
              </Pressable>
            )}
            <Text style={[styles.rankText, { color: rank.color }]}>
              {rank.title}
            </Text>
          </View>

          <View style={styles.bioSection}>
            {isEditingBio ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.bioInput}
                  value={tempBio}
                  onChangeText={setTempBio}
                  multiline
                  autoFocus
                />
                <Pressable style={styles.saveBtn} onPress={handleSaveBio}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.bioRow} onPress={() => setIsEditingBio(true)}>
                <Text style={styles.bioText}>{profile.bio}</Text>
                <Text style={styles.editIcon}>✏️</Text>
              </Pressable>
            )}
          </View>

          {/* Public/Private Toggle */}
          <View style={styles.toggleSection}>
            <Text style={styles.toggleLabel}>Profile Visibility</Text>
            <Pressable
              style={[styles.toggleButton, profile.isPublic && styles.toggleButtonActive]}
              onPress={() => updateProfile({ isPublic: !profile.isPublic })}
            >
              <Text style={styles.toggleButtonText}>
                {profile.isPublic ? '🌐 Public' : '🔒 Private'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{profile.totalXp.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total XP</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{profile.totalSkillsCompleted}</Text>
              <Text style={styles.statLabel}>Skills</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{profile.streakDays}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
          </View>

          {/* Rank Progress */}
          <View style={styles.rankProgressSection}>
            <View style={styles.rankProgressHeader}>
              <Text style={styles.rankProgressText}>
                {isMaxRank ? 'Rank: ' + nextRankTitle : 'Progress to ' + nextRankTitle}
              </Text>
              <Text style={[styles.rankProgressPercent, { color: progressColor }]}>
                {isMaxRank ? 'MAXED' : `${progressPercent}%`}
              </Text>
            </View>
            <View style={styles.rankProgressBar}>
              <View
                style={[
                  styles.rankProgressFill,
                  {
                    backgroundColor: progressColor,
                    width: `${progressPercent}%`
                  }
                ]}
              />
            </View>
          </View>
        </View>

        {/* Achievements Section */}
        <View style={styles.achievementsSection}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.achievementsGrid}>
            {achievements.map((achievement) => (
              <View
                key={achievement.id}
                style={[
                  styles.achievementCard,
                  achievement.unlocked && styles.achievementCardUnlocked,
                ]}
              >
                <Text
                  style={[
                    styles.achievementIcon,
                    !achievement.unlocked && styles.achievementIconLocked,
                  ]}
                >
                  {achievement.icon}
                </Text>
                <Text style={styles.achievementTitle} numberOfLines={2}>
                  {achievement.title}
                </Text>
                <Text style={styles.achievementXp}>+{achievement.xpReward} XP</Text>
                {achievement.unlocked && achievement.unlockedAt && (
                  <Text style={styles.achievementDate}>
                    {new Date(achievement.unlockedAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Learning Goals Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Learning Goals</Text>
            <Pressable
              style={styles.addButton}
              onPress={() => setShowAddGoal(!showAddGoal)}
            >
              <Text style={styles.addButtonText}>{showAddGoal ? '−' : '+'}</Text>
            </Pressable>
          </View>

          {showAddGoal && (
            <View style={styles.addForm}>
              <TextInput
                style={styles.input}
                placeholder="Goal title (e.g., 'Learn React')"
                placeholderTextColor={Colors.textDim}
                value={newGoalTitle}
                onChangeText={setNewGoalTitle}
              />
              <TextInput
                style={styles.input}
                placeholder="Target XP"
                placeholderTextColor={Colors.textDim}
                value={newGoalTargetXp}
                onChangeText={setNewGoalTargetXp}
                keyboardType="numeric"
              />
              <Pressable style={styles.saveBtn} onPress={handleAddGoal}>
                <Text style={styles.saveBtnText}>Add Goal</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.goalsList}>
            {profile.learningGoals.length === 0 ? (
              <Text style={styles.emptyText}>No goals yet. Add your first learning goal!</Text>
            ) : (
              profile.learningGoals.map((goal) => (
                <View key={goal.id} style={styles.goalCard}>
                  <View style={styles.goalHeader}>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    <Pressable
                      onPress={() => deleteLearningGoal(goal.id)}
                      style={styles.deleteSmall}
                    >
                      <Text style={styles.deleteSmallText}>×</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.goalXp}>
                    {Math.min(goal.currentXp, goal.targetXp).toLocaleString()} / {goal.targetXp.toLocaleString()} XP
                  </Text>
                  <View style={styles.goalProgressBar}>
                    <View
                      style={[
                        styles.goalProgressFill,
                        {
                          width: `${Math.min(100, Math.round((goal.currentXp / goal.targetXp) * 100))}%`
                        }
                      ]}
                    />
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Recent Activity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityList}>
            {profile.recentActivity.length === 0 ? (
              <Text style={styles.emptyText}>No recent activity. Start learning to track your progress!</Text>
            ) : (
              profile.recentActivity.map((activity) => (
                <View key={activity.id} style={styles.activityCard}>
                  <View style={styles.activityIcon}>
                    <Text>
                      {activity.type === 'skill' ? '⚡' :
                       activity.type === 'lesson' ? '📚' :
                       activity.type === 'research' ? '🔬' : '🎯'}
                    </Text>
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <Text style={styles.activityDesc}>{activity.description}</Text>
                    <Text style={styles.activityTime}>
                      {new Date(activity.timestamp).toLocaleString()}
                    </Text>
                  </View>
                  <Text style={styles.activityXp}>+{activity.xp} XP</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Portfolio Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Portfolio</Text>
            <Pressable
              style={styles.addButton}
              onPress={() => setShowAddPortfolio(!showAddPortfolio)}
            >
              <Text style={styles.addButtonText}>{showAddPortfolio ? '−' : '+'}</Text>
            </Pressable>
          </View>

          {showAddPortfolio && (
            <View style={styles.addForm}>
              <TextInput
                style={styles.input}
                placeholder="Portfolio item title"
                placeholderTextColor={Colors.textDim}
                value={newPortfolioTitle}
                onChangeText={setNewPortfolioTitle}
              />
              <TextInput
                style={styles.input}
                placeholder="Description"
                placeholderTextColor={Colors.textDim}
                value={newPortfolioDesc}
                onChangeText={setNewPortfolioDesc}
                multiline
              />
              <View style={styles.typeSelector}>
                <Pressable
                  style={[styles.typeButton, newPortfolioType === 'skill' && styles.typeButtonActive]}
                  onPress={() => setNewPortfolioType('skill')}
                >
                  <Text style={styles.typeButtonText}>Skill</Text>
                </Pressable>
                <Pressable
                  style={[styles.typeButton, newPortfolioType === 'tree' && styles.typeButtonActive]}
                  onPress={() => setNewPortfolioType('tree')}
                >
                  <Text style={styles.typeButtonText}>Tree</Text>
                </Pressable>
                <Pressable
                  style={[styles.typeButton, newPortfolioType === 'module' && styles.typeButtonActive]}
                  onPress={() => setNewPortfolioType('module')}
                >
                  <Text style={styles.typeButtonText}>Module</Text>
                </Pressable>
              </View>
              <Pressable style={styles.saveBtn} onPress={handleAddPortfolio}>
                <Text style={styles.saveBtnText}>Add to Portfolio</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.portfolioGrid}>
            {profile.portfolioItems.length === 0 ? (
              <Text style={styles.emptyText}>No portfolio items yet. Showcase your achievements!</Text>
            ) : (
              profile.portfolioItems.map((item) => (
                <View key={item.id} style={styles.portfolioCard}>
                  <View style={styles.portfolioTypeBadge}>
                    <Text style={styles.portfolioTypeText}>
                      {item.type === 'skill' ? '⚡' : item.type === 'tree' ? '🌳' : '📚'}
                    </Text>
                  </View>
                  <Text style={styles.portfolioTitle}>{item.title}</Text>
                  {item.description && (
                    <Text style={styles.portfolioDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                  <Text style={styles.portfolioXp}>+{item.xpEarned} XP</Text>
                  <Pressable
                    onPress={() => deletePortfolioItem(item.id)}
                    style={styles.deleteSmall}
                  >
                    <Text style={styles.deleteSmallText}>×</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
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
    padding: 20,
  },
  headerTitle: {
    ...Typography.heading,
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: 24,
  },
  avatarSection: {
    alignSelf: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  avatarEmoji: {
    fontSize: 64,
  },
  avatarRankBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: Colors.glassBorder,
  },
  avatarRankIcon: {
    fontSize: 20,
  },
  emojiPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: Colors.surfaceElevated,
    padding: 12,
    borderRadius: Radii.lg,
    marginBottom: 16,
    justifyContent: 'center',
  },
  emojiOption: {
    padding: 8,
    borderRadius: 8,
  },
  emojiOptionText: {
    fontSize: 32,
  },
  nameSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameText: {
    ...Typography.heading,
    color: Colors.textPrimary,
    fontSize: 28,
  },
  nameInput: {
    ...Typography.heading,
    color: Colors.textPrimary,
    fontSize: 28,
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  rankText: {
    ...Typography.subheading,
    marginTop: 4,
  },
  bioSection: {
    marginBottom: 20,
  },
  bioRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  bioText: {
    ...Typography.body,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  bioInput: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: Colors.tierFoundation,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radii.sm,
  },
  saveBtnText: {
    ...Typography.body,
    color: '#000',
    fontWeight: '700',
  },
  editIcon: {
    fontSize: 16,
    color: Colors.textDim,
  },
  toggleSection: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  toggleButton: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  toggleButtonActive: {
    backgroundColor: `${Colors.tierFoundation}20`,
    borderColor: Colors.tierFoundation,
  },
  toggleButtonText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    padding: 16,
    borderRadius: Radii.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  statNumber: {
    ...Typography.heading,
    color: Colors.tierFoundation,
    fontSize: 24,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textDim,
    letterSpacing: 0.5,
  },
  rankProgressSection: {
    marginTop: 16,
  },
  rankProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rankProgressText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  rankProgressPercent: {
    ...Typography.body,
    fontWeight: '800',
  },
  rankProgressBar: {
    height: 10,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  rankProgressFill: {
    height: '100%',
    borderRadius: 5,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    ...Typography.subheading,
    color: Colors.textPrimary,
  },
  addButton: {
    width: 32,
    height: 32,
    backgroundColor: Colors.tierFoundation,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#000',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  addForm: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: 16,
    gap: 12,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    paddingVertical: 8,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: `${Colors.tierFoundation}20`,
    borderColor: Colors.tierFoundation,
  },
  typeButtonText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textDim,
    textAlign: 'center',
    paddingVertical: 20,
  },
  achievementsSection: {
    marginBottom: 24,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementCard: {
    width: '30%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
  },
  achievementCardUnlocked: {
    borderColor: Colors.tierFoundation,
    backgroundColor: `${Colors.tierFoundation}10`,
  },
  achievementIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  achievementIconLocked: {
    opacity: 0.3,
  },
  achievementTitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: '600',
  },
  achievementXp: {
    ...Typography.small,
    color: Colors.tierFoundation,
    fontWeight: '700',
  },
  achievementDate: {
    ...Typography.small,
    color: Colors.textDim,
    marginTop: 4,
  },
  goalsList: {
    gap: 12,
  },
  goalCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  goalXp: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  goalProgressBar: {
    height: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: Colors.tierFoundation,
    borderRadius: 4,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  portfolioCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    position: 'relative',
  },
  portfolioTypeBadge: {
    marginBottom: 8,
  },
  portfolioTypeText: {
    fontSize: 20,
  },
  portfolioTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: 4,
  },
  portfolioDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  portfolioXp: {
    ...Typography.small,
    color: Colors.tierFoundation,
    fontWeight: '700',
  },
  deleteSmall: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${Colors.error}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteSmallText: {
    color: Colors.error,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  activityList: {
    gap: 12,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  activityIcon: {
    width: 40,
    height: 40,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
    gap: 4,
  },
  activityTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  activityDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  activityTime: {
    ...Typography.small,
    color: Colors.textDim,
  },
  activityXp: {
    ...Typography.caption,
    color: Colors.tierFoundation,
    fontWeight: '700',
  },
});
