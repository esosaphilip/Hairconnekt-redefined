import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { colors, fonts, fontSizes, spacing } from '@/theme';
import { useLanguage } from '@/contexts/LanguageContext';
import { getSafeLegalUrl } from '@/utils/safe-navigation';

const normalizeParam = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? '';

export default function LegalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useLanguage();

  const url = useMemo(
    () => getSafeLegalUrl(normalizeParam(params.url as any)),
    [params.url],
  );
  const title = useMemo(() => normalizeParam(params.title as any).trim(), [params.title]);
  const [isLoading, setIsLoading] = useState(true);

  const headerTitle = title || t('settingsPrivacy');

  if (!url) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.center}>
          <Text style={styles.errorText}>{t('errorOpenLink')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const safeOrigin = new URL(url).origin;

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <TouchableOpacity onPress={() => Linking.openURL(url)} style={styles.actionButton} activeOpacity={0.7}>
          <Feather name="external-link" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.webviewContainer}>
        <WebView
          source={{ uri: url }}
          originWhitelist={['https://*']}
          onShouldStartLoadWithRequest={(request) => {
            try {
              const nextUrl = new URL(request.url);
              return nextUrl.protocol === 'https:' && nextUrl.origin === safeOrigin;
            } catch {
              return false;
            }
          }}
          onLoadEnd={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            Alert.alert(t('error'), t('errorOpenLink'));
          }}
        />

        {isLoading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    padding: spacing.xs,
  },
  actionButton: {
    padding: spacing.xs,
    width: 40,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    textAlign: 'center',
    flex: 1,
  },
  webviewContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
