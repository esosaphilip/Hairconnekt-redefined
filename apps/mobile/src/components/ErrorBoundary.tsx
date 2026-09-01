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
import { LanguageContext, TRANSLATIONS, type Lang } from '@/contexts/LanguageContext';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorName?: string;
  errorMessage?: string;
}

type TransKey = keyof typeof TRANSLATIONS;

function tFallback(key: TransKey, lang: Lang): string {
  const entry = (TRANSLATIONS as Record<TransKey, { de: string; en: string } | undefined>)[key];
  return entry?.[lang] ?? entry?.de ?? String(key);
}

interface CtxShape {
  lang?: Lang;
  t?: (k: string) => string;
}

function resolve(key: TransKey, ctx: CtxShape | null | undefined): string {
  try {
    if (ctx && typeof ctx.t === 'function') {
      return ctx.t(key as string);
    }
    const lang: Lang = (ctx && ctx.lang) || 'de';
    return tFallback(key, lang);
  } catch {
    return tFallback(key, 'de');
  }
}

export class ErrorBoundary extends Component<Props, State> {
  static contextType = LanguageContext;

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

    const ctx = this.context as CtxShape | undefined;
    return this.renderFallback(ctx);
  }

  private renderFallback = (ctx: CtxShape | undefined): ReactNode => {
    const showDetails = __DEV__;
    const title = resolve('errorBoundaryTitle', ctx);
    const subtitle = resolve('errorBoundarySubtitle', ctx);
    const devHint = resolve('errorBoundaryDevHint', ctx);
    const reloadLabel = resolve('errorBoundaryReload', ctx);

    return React.createElement(
      View,
      { style: styles.outer },
      React.createElement(
        ScrollView,
        {
          contentContainerStyle: styles.content,
          bounces: false,
          keyboardShouldPersistTaps: 'handled',
        },
        React.createElement(
          View,
          { style: styles.card },
          React.createElement(Text, { style: styles.emoji }, '🫠'),
          React.createElement(Text, { style: styles.title }, title),
          React.createElement(Text, { style: styles.subtitle }, subtitle),
          showDetails
            ? React.createElement(
                View,
                { style: styles.detailsCard },
                React.createElement(
                  Text,
                  { style: styles.detailsTitle },
                  this.state.errorName ?? 'Uncaught Error',
                ),
                React.createElement(
                  Text,
                  { style: styles.detailsBody, selectable: true },
                  this.state.errorMessage ?? 'No details available.',
                ),
                React.createElement(
                  Text,
                  { style: styles.detailsHint },
                  `${Platform.OS === 'ios' ? 'iOS' : 'Android'} · ${devHint}`,
                ),
              )
            : null,
          React.createElement(
            View,
            { style: styles.actions },
            React.createElement(PrimaryButton, {
              label: reloadLabel,
              onPress: this.handleReload,
            }),
          ),
        ),
      ),
    );
  };
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
