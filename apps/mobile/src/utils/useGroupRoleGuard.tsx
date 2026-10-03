import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { tokenStorage } from './token-storage';
import { apiJson } from '@/services/apiClient';
import { ApiError } from '@/services/apiClient';
import { colors } from '@/theme';
import {
  Group,
  GuardDecision,
  guardDecision,
  providerDestinationFromError,
  providerDestinationFromStatus,
  providerDestinationRoute,
} from './roleRouting';

const useGroupRoleGuard = (group: Group) => {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(group !== 'client');
  const redirectingRef = useRef(false);
  const checkedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const run = async () => {
        if (redirectingRef.current) return;

        const token = await tokenStorage.getAccessToken();
        const role = await tokenStorage.getUserRole();
        const hasToken = Boolean(token);

        const decision: GuardDecision = guardDecision({ group, hasToken, role });

        if (decision === 'allow') {
          if (!cancelled) setIsChecking(false);
          checkedRef.current = true;
          return;
        }

        redirectingRef.current = true;

        if (group === 'client') {
          try {
            const provider = await apiJson<any>('/providers/me', { auth: true });
            const dest = providerDestinationFromStatus(provider);
            router.replace(providerDestinationRoute(dest) as any);
          } catch (err: any) {
            if (err instanceof ApiError && err.status === 404) {
              router.replace(providerDestinationRoute(providerDestinationFromError({ status: 404 })) as any);
            } else {
              router.replace(providerDestinationRoute(providerDestinationFromError(err)) as any);
            }
          }
          return;
        }

        if (hasToken && role !== 'provider') {
          router.replace('/(client)' as any);
        } else {
          router.replace('/(auth)/login?role=provider' as any);
        }
      };

      void run();

      return () => {
        cancelled = true;
      };
    }, [group, router]),
  );

  useEffect(() => {
    if (group === 'client' && !checkedRef.current) {
      setIsChecking(false);
    }
  }, [group]);

  return isChecking;
};

export const GroupGuardGate: React.FC<{
  isChecking: boolean;
  group: Group;
  children: React.ReactNode;
}> = ({ isChecking, group, children }) => {
  if (isChecking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export { useGroupRoleGuard };
