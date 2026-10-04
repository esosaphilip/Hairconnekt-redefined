import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { tokenStorage } from './token-storage';
import { apiJson, ApiError } from '@/services/apiClient';
import { colors } from '@/theme';
import {
  Group,
  GuardDecision,
  guardInitialChecking,
  groupForRole,
  guardDecision,
  providerDestinationFromError,
  providerDestinationFromStatus,
  providerDestinationRoute,
} from './roleRouting';

const dismissAllThenReplace = (router: any, destination: string): void => {
  try {
    if (typeof router.canDismiss === 'function' && router.canDismiss()) {
      router.dismissAll();
    }
  } catch {
    // ignore; fall through to replace
  }
  router.replace(destination as any);
};

const useGroupRoleGuard = (group: Group) => {
  const router = useRouter();
  const initial = tokenStorage.peekSession();
  const [isChecking, setIsChecking] = useState<boolean>(
    guardInitialChecking({
      group,
      sessionKnown: initial.known,
      sessionHasToken: initial.hasToken,
      sessionRole: initial.role,
    }),
  );
  const redirectingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      // C2: every time focus returns, synchronously decide whether the screen
      // should be hidden right now, before any await.
      const focusSnapshot = tokenStorage.peekSession();
      const shouldHideOnEntry = guardInitialChecking({
        group,
        sessionKnown: focusSnapshot.known,
        sessionHasToken: focusSnapshot.hasToken,
        sessionRole: focusSnapshot.role,
      });
      if (shouldHideOnEntry) {
        setIsChecking(true);
      }

      const run = async () => {
        if (redirectingRef.current) return;

        let token: string | null = null;
        let role: string | null = null;
        let hasToken = false;
        try {
          token = await tokenStorage.getAccessToken();
          role = await tokenStorage.getUserRole();
          hasToken = Boolean(token);
        } catch {
          if (group === 'provider') {
            redirectingRef.current = true;
            dismissAllThenReplace(router, '/(auth)/login?role=provider');
          } else {
            setIsChecking(false);
          }
          return;
        }

        const decision: GuardDecision = guardDecision({ group, hasToken, role });

        if (decision === 'allow') {
          if (!cancelled) setIsChecking(false);
          return;
        }

        // C2: decision is leave; hide content BEFORE any await / navigation.
        setIsChecking(true);
        redirectingRef.current = true;

        if (group === 'client') {
          try {
            const provider = await apiJson<any>('/providers/me', { auth: true });
            const route = providerDestinationRoute(
              providerDestinationFromStatus(provider),
            );
            dismissAllThenReplace(router, route);
          } catch (err: any) {
            const mapped =
              err instanceof ApiError && err.status === 404
                ? providerDestinationFromError({ status: 404 })
                : providerDestinationFromError(err);
            dismissAllThenReplace(router, providerDestinationRoute(mapped));
          }
          return;
        }

        // group === 'provider' && decision === 'leave'
        // (groupForRole(role) === 'provider' && hasToken is unreachable here
        // because that combination would have produced decision === 'allow'.)
        if (hasToken) {
          dismissAllThenReplace(router, '/(client)');
        } else {
          dismissAllThenReplace(router, '/(auth)/login?role=provider');
        }
      };

      void run();

      return () => {
        cancelled = true;
        redirectingRef.current = false;
      };
    }, [group, router]),
  );

  return isChecking;
};

export const GroupGuardGate: React.FC<{
  isChecking: boolean;
  group: Group;
  children: React.ReactNode;
}> = ({ isChecking, children }) => {
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

export { useGroupRoleGuard, dismissAllThenReplace };
