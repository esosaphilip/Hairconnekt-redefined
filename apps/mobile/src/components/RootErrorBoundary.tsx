import React, { Component, type ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';
import { colors, fonts, fontSizes, spacing, borderRadius, layout } from '@/theme';
import { debugError } from '@/utils/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class RootErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    debugError('RootErrorBoundary caught:', error);
    try {
      Sentry.captureException(error, {
        contexts: { react: { componentStack: info.componentStack } },
      });
    } catch {
      // Sentry may be disabled; swallow silently
    }
  }

  private handleReload = async (): Promise<void> => {
    this.setState({ hasError: false });
    try {
      if (__DEV__) {
        return;
      }
      await Updates.reloadAsync();
    } catch (error) {
      debugError('RootErrorBoundary reload failed:', error);
    }
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.outer}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🛟</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.titleSecondary}>Etwas ist schiefgelaufen</Text>
          <Text style={styles.subtitle}>
            Please restart the app.{'\n'}Bitte starte die App neu.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={this.handleReload}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Restart / Neustarten</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  titleSecondary: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSizes.lg,
    marginBottom: spacing.lg,
  },
  button: {
    minHeight: layout.buttonHeight,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.md,
    color: colors.surface,
  },
});
