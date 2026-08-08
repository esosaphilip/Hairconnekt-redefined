import React, { Component, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';
import { PrimaryButton } from './PrimaryButton';
import { colors, fonts, fontSizes, spacing, borderRadius } from '@/theme';
import { debugError } from '@/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorName?: string;
  errorMessage?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorName: error.name,
      errorMessage: error.message,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    debugError('ErrorBoundary caught:', error);
    try {
      Sentry.captureException(error, {
        contexts: { react: { componentStack: info.componentStack } },
      });
    } catch {
      // Sentry may be disabled (no DSN); swallow silently
    }
  }

  private handleReload = async (): Promise<void> => {
    this.setState({ hasError: false, errorName: undefined, errorMessage: undefined });
    try {
      if (__DEV__) {
        return;
      }
      await Updates.reloadAsync();
    } catch (error) {
      debugError('ErrorBoundary reload failed:', error);
    }
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    const showDetails = __DEV__;

    return (
      <View style={styles.outer}>
        <ScrollView
          contentContainerStyle={styles.content}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.emoji}>🫠</Text>
            <Text style={styles.title}>Etwas ist schiefgelaufen</Text>
            <Text style={styles.subtitle}>
              Bitte lade die App neu. Sollte das Problem weiterhin bestehen, starte die App vollständig.
            </Text>

            {showDetails && (
              <View style={styles.detailsCard}>
                <Text style={styles.detailsTitle}>
                  {this.state.errorName ?? 'Uncaught Error'}
                </Text>
                <Text style={styles.detailsBody} selectable>
                  {this.state.errorMessage ?? 'No details available.'}
                </Text>
                <Text style={styles.detailsHint}>
                  {Platform.OS === 'ios' ? 'iOS' : 'Android'} · nur im Entwicklermodus sichtbar
                </Text>
              </View>
            )}

            <View style={styles.actions}>
              <PrimaryButton label="App neu laden" onPress={this.handleReload} />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSizes.lg,
    marginBottom: spacing.lg,
  },
  detailsCard: {
    backgroundColor: colors.errorLightSolid,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  detailsTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  detailsBody: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textPrimary,
    lineHeight: fontSizes.md,
  },
  detailsHint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  actions: {
    marginTop: spacing.sm,
  },
});
