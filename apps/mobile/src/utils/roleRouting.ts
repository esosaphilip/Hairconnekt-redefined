import type { UserRole } from '@hairconnekt/types';

export type Group = 'client' | 'provider';

export type RoleLike = UserRole | string | null | undefined;

export const groupForRole = (role: RoleLike): Group | null => {
  const normalized = typeof role === 'string' ? role.trim().toLowerCase() : '';
  if (normalized === 'client') return 'client';
  if (normalized === 'provider') return 'provider';
  return null;
};

export interface GuardDecisionInput {
  group: Group;
  hasToken: boolean;
  role: RoleLike;
}

export type GuardDecision = 'allow' | 'leave';

export const guardDecision = (input: GuardDecisionInput): GuardDecision => {
  const { group, hasToken, role } = input;
  const effectiveRole = groupForRole(role);

  if (group === 'client') {
    if (hasToken && effectiveRole === 'provider') return 'leave';
    return 'allow';
  }

  if (hasToken && effectiveRole === 'provider') return 'allow';
  return 'leave';
};

export type LoginTab = 'client' | 'provider';

export const loginTabMismatch = (
  selectedTab: LoginTab,
  accountRole: RoleLike,
): Group | null => {
  const real = groupForRole(accountRole);
  if (real === null) return null;
  if (selectedTab === real) return null;
  return real;
};

export interface PreselectedTabInput {
  urlRole?: string | string[] | null;
  rememberedRole?: string | null;
}

export const preselectedLoginTab = (input: PreselectedTabInput): LoginTab => {
  const urlRaw = Array.isArray(input.urlRole) ? input.urlRole[0] : input.urlRole;
  if (typeof urlRaw === 'string') {
    const urlGroup = groupForRole(urlRaw);
    if (urlGroup) return urlGroup;
  }
  const remembered = groupForRole(input.rememberedRole);
  if (remembered) return remembered;
  return 'client';
};

export type ProviderDestination =
  | { kind: 'home' }
  | { kind: 'pending' }
  | { kind: 'register' }
  | { kind: 'login' };

export interface ProviderStatusResponse {
  status?: string | null;
}

export interface ProviderStatusRequestError {
  status?: number;
}

export const providerDestinationFromStatus = (
  status: ProviderStatusResponse | undefined,
): ProviderDestination => {
  if (status && String(status.status ?? '').trim().toLowerCase() === 'approved') {
    return { kind: 'home' };
  }
  return { kind: 'pending' };
};

export const providerDestinationFromError = (
  err: ProviderStatusRequestError | undefined,
): ProviderDestination => {
  if (err && err.status === 404) return { kind: 'register' };
  return { kind: 'pending' };
};

export const providerDestinationRoute = (dest: ProviderDestination): string => {
  switch (dest.kind) {
    case 'home':
      return '/(provider)';
    case 'pending':
      return '/(provider)/pending';
    case 'register':
      return '/(auth)/provider-register/type';
    case 'login':
      return '/(auth)/login?role=provider';
  }
};

export interface LoginRoutingDecision {
  destination: string;
  noticeSide: Group | null;
  resetHistory: boolean;
  honorReturnTo: boolean;
}

export interface LoginRoutingInput {
  accountRole: RoleLike;
  selectedTab: LoginTab;
  returnTo?: string | null;
  providerStatus?: ProviderStatusResponse;
  providerStatusError?: ProviderStatusRequestError;
}

export const loginRoutingDecision = (input: LoginRoutingInput): LoginRoutingDecision | null => {
  const real = groupForRole(input.accountRole);
  if (real === null) return null;

  const noticeSide = loginTabMismatch(input.selectedTab, input.accountRole);

  if (real === 'client') {
    const hasReturnTo = typeof input.returnTo === 'string' && input.returnTo.length > 0;
    const destination = hasReturnTo ? (input.returnTo as string) : '/(client)';
    return {
      destination,
      noticeSide,
      resetHistory: false,
      honorReturnTo: true,
    };
  }

  let dest: ProviderDestination;
  if (input.providerStatus !== undefined) {
    dest = providerDestinationFromStatus(input.providerStatus);
  } else if (input.providerStatusError !== undefined) {
    dest = providerDestinationFromError(input.providerStatusError);
  } else {
    dest = { kind: 'pending' };
  }
  return {
    destination: providerDestinationRoute(dest),
    noticeSide,
    resetHistory: true,
    honorReturnTo: false,
  };
};

export interface SplashRoleDecision {
  route: string;
  saveRole?: UserRole | null;
}

export interface SplashRoleInput {
  hasToken: boolean;
  storedRole: RoleLike;
  serverRole?: RoleLike;
  providerStatus?: ProviderStatusResponse;
  providerStatusError?: ProviderStatusRequestError;
  serverEmailUnverified?: boolean;
  serverEmail?: string;
}

export const splashRoleDecision = (input: SplashRoleInput): SplashRoleDecision => {
  if (!input.hasToken) {
    return { route: '/(client)' };
  }

  const serverGroup = input.serverRole !== undefined ? groupForRole(input.serverRole) : null;
  const storedGroup = groupForRole(input.storedRole);
  const effectiveGroup = serverGroup ?? storedGroup;

  const saveRole: UserRole | null =
    serverGroup !== null && serverGroup !== storedGroup ? (serverGroup as UserRole) : null;

  if (input.serverEmailUnverified) {
    const side = effectiveGroup === 'provider' ? 'provider' : 'client';
    const email = typeof input.serverEmail === 'string' ? input.serverEmail : '';
    const screen =
      side === 'provider'
        ? `/(auth)/provider-verify-email?email=${encodeURIComponent(email)}`
        : `/(auth)/verify-email?email=${encodeURIComponent(email)}`;
    return { route: screen, saveRole };
  }

  if (effectiveGroup === 'provider') {
    let dest: ProviderDestination;
    if (input.providerStatus !== undefined) {
      dest = providerDestinationFromStatus(input.providerStatus);
    } else if (input.providerStatusError !== undefined) {
      if (input.providerStatusError.status === 404) {
        dest = providerDestinationFromError(input.providerStatusError);
      } else {
        dest = { kind: 'login' };
      }
    } else {
      dest = { kind: 'pending' };
    }
    return { route: providerDestinationRoute(dest), saveRole };
  }

  return { route: '/(client)', saveRole };
};
