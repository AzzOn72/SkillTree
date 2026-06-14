/**
 * SkillGrid — ErrorScreen
 *
 * Full-screen error overlay shown when validation or network requests fail.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import type { AppError } from '../../types';
import { Colors, Typography } from '../../constants/theme';

interface ErrorScreenProps {
  error: AppError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({ error, onRetry, onDismiss }) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>{error.message}</Text>
        
        {error.detail && (
          <ScrollView style={styles.detailScroll} bounces={false}>
            <Text style={styles.detail}>{error.detail}</Text>
          </ScrollView>
        )}

        <View style={styles.actions}>
          {error.canRegenerate && onRetry && (
            <Pressable style={styles.retryBtn} onPress={onRetry}>
              <Text style={styles.retryBtnText}>Regenerate</Text>
            </Pressable>
          )}
          {onDismiss && (
            <Pressable style={styles.dismissBtn} onPress={onDismiss}>
              <Text style={styles.dismissBtnText}>Dismiss</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 1000,
  },
  card: {
    backgroundColor: Colors.surfaceRaised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FF4444',
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  icon: {
    fontSize: 32,
    marginBottom: 12,
    textAlign: 'center',
  },
  title: {
    ...Typography.heading,
    color: '#FF6666',
    textAlign: 'center',
    marginBottom: 12,
  },
  detailScroll: {
    backgroundColor: '#1A0808',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#331111',
  },
  detail: {
    ...Typography.caption,
    color: '#FF8888',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  retryBtn: {
    flex: 1,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  retryBtnText: {
    ...Typography.subheading,
    color: '#FFF',
  },
  dismissBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dismissBtnText: {
    ...Typography.subheading,
    color: Colors.textPrimary,
  },
});
