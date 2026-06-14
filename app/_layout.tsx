/**
 * SkillGrid — Root Layout with Tab Navigation
 *
 * App entry point. Handles:
 *   1. Cold start hydration
 *   2. SafeArea wrapping
 *   3. Bottom Tab navigation
 *   4. Dark theme default
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSkillGridStore } from '../src/store/skillTreeStore';
import { Colors } from '../src/constants/theme';

const TAB_ICONS = {
  index: '🌳',
  profile: '👤',
  learn: '📚',
  homework: '✏️',
  research: '🔬',
} as const;

const TAB_LABELS = {
  index: 'Skills',
  profile: 'Profile',
  learn: 'Learn',
  homework: 'Homework',
  research: 'Research',
} as const;

export default function RootLayout() {
  const [isHydrated, setIsHydrated] = useState(false);
  const hydrateFromStorage = useSkillGridStore((s) => s.hydrateFromStorage);
  const { activeTab, setActiveTab } = useSkillGridStore();

  useEffect(() => {
    const hydrate = async () => {
      await hydrateFromStorage();
      setIsHydrated(true);
    };
    hydrate();
  }, [hydrateFromStorage]);

  if (!isHydrated) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.root}>
        <StatusBar style="light" />
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: styles.tabBar,
            tabBarActiveTintColor: Colors.tierFoundation,
            tabBarInactiveTintColor: Colors.textDim,
            tabBarShowLabel: true,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Skills',
              tabBarIcon: ({ color, size }) => (
                <Text style={{ fontSize: size, color }}>{TAB_ICONS.index}</Text>
              ),
            }}
          />
          <Tabs.Screen
            name="learn"
            options={{
              title: 'Learn',
              tabBarIcon: ({ color, size }) => (
                <Text style={{ fontSize: size, color }}>{TAB_ICONS.learn}</Text>
              ),
            }}
          />
          <Tabs.Screen
            name="homework"
            options={{
              title: 'Homework',
              tabBarIcon: ({ color, size }) => (
                <Text style={{ fontSize: size, color }}>{TAB_ICONS.homework}</Text>
              ),
            }}
          />
          <Tabs.Screen
            name="research"
            options={{
              title: 'Research',
              tabBarIcon: ({ color, size }) => (
                <Text style={{ fontSize: size, color }}>{TAB_ICONS.research}</Text>
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color, size }) => (
                <Text style={{ fontSize: size, color }}>{TAB_ICONS.profile}</Text>
              ),
            }}
          />
          <Tabs.Screen
            name="tree/[goalId]"
            options={{ href: null }}
          />
        </Tabs>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
    paddingBottom: 8,
    paddingTop: 8,
    height: 65,
  },
});

