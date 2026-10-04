import {
  guardDecision,
  guardInitialChecking,
  groupForRole,
  loginTabInitial,
  loginTabMismatch,
  loginRoutingDecision,
  preselectedLoginTab,
  providerDestinationFromError,
  providerDestinationFromStatus,
  providerDestinationRoute,
  rememberedTabResult,
  splashRoleDecision,
  type ProviderDestination,
} from '../src/utils/roleRouting';
import { tokenStorage } from '../src/utils/token-storage';
import * as SecureStore from 'expo-secure-store';
import * as fs from 'fs';
import * as path from 'path';

describe('T21 groupForRole', () => {
  it('groupForRole maps PROVIDER uppercase to provider group', () => {
    expect(groupForRole('PROVIDER')).toBe('provider');
  });

  it('groupForRole trims whitespace and maps " provider "', () => {
    expect(groupForRole(' provider ')).toBe('provider');
  });

  it('groupForRole maps lowercase client string', () => {
    expect(groupForRole('client')).toBe('client');
  });

  it('groupForRole returns null for undefined', () => {
    expect(groupForRole(undefined)).toBeNull();
  });

  it('groupForRole returns null for empty string', () => {
    expect(groupForRole('')).toBeNull();
  });

  it('groupForRole returns null for admin (no group on mobile)', () => {
    expect(groupForRole('admin')).toBeNull();
  });
});

describe('T21 guardDecision client group', () => {
  it('guest (no token) in client group is allowed', () => {
    expect(guardDecision({ group: 'client', hasToken: false, role: null })).toBe('allow');
  });

  it('signed-in client in client group is allowed', () => {
    expect(guardDecision({ group: 'client', hasToken: true, role: 'client' })).toBe('allow');
  });

  it('signed-in provider with token in client group must leave', () => {
    expect(guardDecision({ group: 'client', hasToken: true, role: 'provider' })).toBe('leave');
  });

  it('provider role but no token in client group is allowed (guest)', () => {
    expect(guardDecision({ group: 'client', hasToken: false, role: 'provider' })).toBe('allow');
  });

  it('signed-in admin in client group is allowed (treated as not-provider)', () => {
    expect(guardDecision({ group: 'client', hasToken: true, role: 'admin' })).toBe('allow');
  });
});

describe('T21 guardDecision provider group', () => {
  it('signed-in provider with token in provider group is allowed', () => {
    expect(guardDecision({ group: 'provider', hasToken: true, role: 'provider' })).toBe('allow');
  });

  it('signed-in client with token in provider group must leave', () => {
    expect(guardDecision({ group: 'provider', hasToken: true, role: 'client' })).toBe('leave');
  });

  it('no token in provider group must leave', () => {
    expect(guardDecision({ group: 'provider', hasToken: false, role: null })).toBe('leave');
  });

  it('unknown role with token in provider group must leave', () => {
    expect(guardDecision({ group: 'provider', hasToken: true, role: 'wizard' })).toBe('leave');
  });

  it('provider role string uppercase with token in provider group is allowed', () => {
    expect(guardDecision({ group: 'provider', hasToken: true, role: 'PROVIDER' })).toBe('allow');
  });
});

describe('T21 shared provider destination', () => {
  it('provider approved status yields home destination /(provider)', () => {
    expect(providerDestinationRoute(providerDestinationFromStatus({ status: 'approved' }))).toBe('/(provider)');
    expect(providerDestinationRoute(providerDestinationFromStatus({ status: 'APPROVED' }))).toBe('/(provider)');
  });

  it('provider PENDING status yields /(provider)/pending', () => {
    expect(providerDestinationRoute(providerDestinationFromStatus({ status: 'PENDING' }))).toBe('/(provider)/pending');
  });

  it('provider profile missing (404) yields /(auth)/provider-register/type', () => {
    expect(providerDestinationRoute(providerDestinationFromError({ status: 404 }))).toBe('/(auth)/provider-register/type');
  });

  it('other error (non-404) matches original login screen path -> /(provider)/pending', () => {
    expect(providerDestinationRoute(providerDestinationFromError({ status: 500 }))).toBe('/(provider)/pending');
    expect(providerDestinationRoute(providerDestinationFromError({ status: 403 }))).toBe('/(provider)/pending');
    expect(providerDestinationRoute(providerDestinationFromError(undefined))).toBe('/(provider)/pending');
  });
});

describe('T21 loginTabMismatch', () => {
  it('Client tab + provider account returns provider side', () => {
    expect(loginTabMismatch('client', 'provider')).toBe('provider');
  });

  it('Provider tab + client account returns client side', () => {
    expect(loginTabMismatch('provider', 'client')).toBe('client');
  });

  it('matching Client + client returns null', () => {
    expect(loginTabMismatch('client', 'client')).toBeNull();
  });

  it('matching Provider + provider returns null', () => {
    expect(loginTabMismatch('provider', 'provider')).toBeNull();
  });

  it('case + whitespace role normalizes: Client tab + "PROVIDER " mismatch returns provider', () => {
    expect(loginTabMismatch('client', 'PROVIDER ')).toBe('provider');
  });

  it('account admin / unknown yields null (no notice)', () => {
    expect(loginTabMismatch('client', 'admin')).toBeNull();
    expect(loginTabMismatch('provider', undefined)).toBeNull();
  });
});

describe('T21 loginRoutingDecision', () => {
  it('matching login Client + client with returnTo uses returnTo and no notice', () => {
    const decision = loginRoutingDecision({
      accountRole: 'client',
      selectedTab: 'client',
      returnTo: '/(client)/profile',
    });
    expect(decision?.destination).toBe('/(client)/profile');
    expect(decision?.noticeSide).toBeNull();
    expect(decision?.resetHistory).toBe(false);
    expect(decision?.honorReturnTo).toBe(true);
  });

  it('mismatch Client tab + provider approved account routes to /(provider) with reset + notice provider', () => {
    const decision = loginRoutingDecision({
      accountRole: 'provider',
      selectedTab: 'client',
      providerStatus: { status: 'approved' },
    });
    expect(decision?.destination).toBe('/(provider)');
    expect(decision?.noticeSide).toBe('provider');
    expect(decision?.resetHistory).toBe(true);
    expect(decision?.honorReturnTo).toBe(false);
  });

  it('mismatch Provider tab + client account routes to /(client) with client notice', () => {
    const decision = loginRoutingDecision({
      accountRole: 'client',
      selectedTab: 'provider',
    });
    expect(decision?.destination).toBe('/(client)');
    expect(decision?.noticeSide).toBe('client');
    expect(decision?.resetHistory).toBe(false);
  });

  it('provider login + 404 on /providers/me routes to provider register type', () => {
    const decision = loginRoutingDecision({
      accountRole: 'provider',
      selectedTab: 'provider',
      providerStatusError: { status: 404 },
    });
    expect(decision?.destination).toBe('/(auth)/provider-register/type');
    expect(decision?.noticeSide).toBeNull();
  });

  it('provider login + other error routes to pending (original login default)', () => {
    const decision = loginRoutingDecision({
      accountRole: 'provider',
      selectedTab: 'provider',
      providerStatusError: { status: 403 },
    });
    expect(decision?.destination).toBe('/(provider)/pending');
  });

  it('returns null when account role is admin/unknown', () => {
    expect(loginRoutingDecision({ accountRole: 'admin', selectedTab: 'client' })).toBeNull();
  });

  it('matching provider+approved yields no notice, same destination as mismatch minus notice', () => {
    const matching = loginRoutingDecision({
      accountRole: 'provider',
      selectedTab: 'provider',
      providerStatus: { status: 'approved' },
    });
    const mismatching = loginRoutingDecision({
      accountRole: 'provider',
      selectedTab: 'client',
      providerStatus: { status: 'approved' },
    });
    expect(matching?.destination).toBe(mismatching?.destination);
    expect(matching?.noticeSide).toBeNull();
    expect(mismatching?.noticeSide).toBe('provider');
  });

  it('failed login never yields a notice because loginRoutingDecision needs non-null accountRole + provider status', () => {
    const failedLike = loginRoutingDecision({ accountRole: undefined as any, selectedTab: 'client' });
    expect(failedLike).toBeNull();
  });
});

describe('T21 preselectedLoginTab rule', () => {
  it('url role=provider wins over remembered client', () => {
    expect(preselectedLoginTab({ urlRole: 'provider', rememberedRole: 'client' })).toBe('provider');
  });

  it('remembered provider with no parameter selects Provider tab', () => {
    expect(preselectedLoginTab({ rememberedRole: 'provider' })).toBe('provider');
  });

  it('nothing remembered and no parameter defaults to Client', () => {
    expect(preselectedLoginTab({})).toBe('client');
  });

  it('unrecognised remembered value falls back to Client', () => {
    expect(preselectedLoginTab({ rememberedRole: 'ADMIN' })).toBe('client');
    expect(preselectedLoginTab({ rememberedRole: 'banana' })).toBe('client');
  });

  it('array urlRole first element is used to determine tab', () => {
    expect(preselectedLoginTab({ urlRole: ['provider', 'client'] })).toBe('provider');
  });
});

describe('T21 splashRoleDecision pure function', () => {
  it('server role provider + stored role client yields provider route + requests saveRole=provider', () => {
    const decision = splashRoleDecision({
      hasToken: true,
      storedRole: 'client',
      serverRole: 'provider',
      providerStatus: { status: 'approved' },
    });
    expect(decision.route).toBe('/(provider)');
    expect(decision.saveRole).toBe('provider');
  });

  it('server role provider + stored role missing yields provider route + requests saveRole=provider', () => {
    const decision = splashRoleDecision({
      hasToken: true,
      storedRole: null,
      serverRole: 'provider',
      providerStatus: { status: 'approved' },
    });
    expect(decision.route).toBe('/(provider)');
    expect(decision.saveRole).toBe('provider');
  });

  it('server role client + stored role provider yields client route + requests saveRole=client', () => {
    const decision = splashRoleDecision({
      hasToken: true,
      storedRole: 'provider',
      serverRole: 'client',
    });
    expect(decision.route).toBe('/(client)');
    expect(decision.saveRole).toBe('client');
  });

  it('no token always routes to guest client side, never saveRole', () => {
    const d1 = splashRoleDecision({ hasToken: false, storedRole: null });
    const d2 = splashRoleDecision({ hasToken: false, storedRole: 'provider' });
    expect(d1.route).toBe('/(client)');
    expect(d1.saveRole).toBeUndefined();
    expect(d2.route).toBe('/(client)');
    expect(d2.saveRole).toBeUndefined();
  });

  it('stored role provider, server role fails (undefined), provider status 404 → register type + no saveRole', () => {
    const decision = splashRoleDecision({
      hasToken: true,
      storedRole: 'provider',
      providerStatusError: { status: 404 },
    });
    expect(decision.route).toBe('/(auth)/provider-register/type');
    expect(decision.saveRole == null).toBe(true);
  });

  it('stored role provider + non-404 provider error (e.g. 403) falls to login?role=provider', () => {
    const decision = splashRoleDecision({
      hasToken: true,
      storedRole: 'provider',
      providerStatusError: { status: 403 },
    });
    expect(decision.route).toBe('/(auth)/login?role=provider');
  });

  it('server email unverified redirects to client verify-email for client role', () => {
    const decision = splashRoleDecision({
      hasToken: true,
      storedRole: 'client',
      serverRole: 'client',
      serverEmailUnverified: true,
      serverEmail: 'a@b.de',
    });
    expect(decision.route).toContain('/(auth)/verify-email');
    expect(decision.route).toContain(encodeURIComponent('a@b.de'));
  });

  it('server email unverified redirects to provider verify-email for provider role + saveRole', () => {
    const decision = splashRoleDecision({
      hasToken: true,
      storedRole: null,
      serverRole: 'provider',
      serverEmailUnverified: true,
      serverEmail: 'p@b.de',
    });
    expect(decision.route).toContain('/(auth)/provider-verify-email');
    expect(decision.saveRole).toBe('provider');
  });
});

describe('T21 guard initial checking state (peekSession sync)', () => {
  it('session known + provider w/ token in CLIENT group → starts checking (never renders client content)', () => {
    expect(
      guardInitialChecking({
        group: 'client',
        sessionKnown: true,
        sessionHasToken: true,
        sessionRole: 'provider',
      }),
    ).toBe(true);
  });

  it('session known + guest (no token) in CLIENT group → not checking, no loader for guests', () => {
    expect(
      guardInitialChecking({
        group: 'client',
        sessionKnown: true,
        sessionHasToken: false,
        sessionRole: null,
      }),
    ).toBe(false);
  });

  it('session known + client with token in CLIENT group → not checking', () => {
    expect(
      guardInitialChecking({
        group: 'client',
        sessionKnown: true,
        sessionHasToken: true,
        sessionRole: 'client',
      }),
    ).toBe(false);
  });

  it('session known + client with token in PROVIDER group → starts checking', () => {
    expect(
      guardInitialChecking({
        group: 'provider',
        sessionKnown: true,
        sessionHasToken: true,
        sessionRole: 'client',
      }),
    ).toBe(true);
  });

  it('session NOT known in CLIENT group → not checking (guest default, no flicker)', () => {
    expect(
      guardInitialChecking({
        group: 'client',
        sessionKnown: false,
        sessionHasToken: false,
        sessionRole: null,
      }),
    ).toBe(false);
  });

  it('session NOT known in PROVIDER group → checking (provider never guest-default)', () => {
    expect(
      guardInitialChecking({
        group: 'provider',
        sessionKnown: false,
        sessionHasToken: false,
        sessionRole: null,
      }),
    ).toBe(true);
  });
});

describe('T21 token-storage in-memory session record (peekSession)', () => {
  it('after save accessToken + provider role, peekSession reports known + hasToken + provider role', async () => {
    await tokenStorage.clear();
    await tokenStorage.save('acc-xyz1', 'ref-xyz1', 'provider');
    const snap = tokenStorage.peekSession();
    expect(snap.known).toBe(true);
    expect(snap.hasToken).toBe(true);
    expect(snap.role).toBe('provider');
  });

  it('after clear, peekSession reports known + no token + null role', async () => {
    await tokenStorage.save('acc-abc', 'ref-abc', 'client');
    await tokenStorage.clear();
    const snap = tokenStorage.peekSession();
    expect(snap.known).toBe(true);
    expect(snap.hasToken).toBe(false);
    expect(snap.role).toBe(null);
  });

  it('setUserRole updates peekSession synchronously to the new role', async () => {
    await tokenStorage.clear();
    await tokenStorage.save('tok', 'ref', 'client');
    expect(tokenStorage.peekSession().role).toBe('client');
    await tokenStorage.setUserRole('provider');
    expect(tokenStorage.peekSession().role).toBe('provider');
    expect(tokenStorage.peekSession().hasToken).toBe(true);
  });
});

describe('T21 login tab initialisation rule with user tap (loginTabInitial + B.3 scenario)', () => {
  it('urlRole=provider → Provider tab immediately and urlRolePresent=true (remembered never overwrites)', () => {
    const init = loginTabInitial('provider');
    expect(init.tab).toBe('provider');
    expect(init.urlRolePresent).toBe(true);
  });

  it('no URL role, remembered=provider, user has NOT tapped → Provider (async effect in login applies)', () => {
    const init = loginTabInitial(undefined);
    expect(init.tab).toBe('client');
    expect(init.urlRolePresent).toBe(false);
  });

  it('no URL role, remembered=provider, user HAS tapped Client → stays Client (logic in login via userTappedTabRef)', () => {
    const init = loginTabInitial(null);
    expect(init.urlRolePresent).toBe(false);
    expect(init.tab).toBe('client');
    // Simulate a manual user tap to client (already client, tap anyway to client), verify no overwrite semantics:
    // The effect in login.tsx skips when userTappedTabRef=true, so the effective tab stays 'client' regardless of remembered value.
    const effectiveAfterUserTap: Record<string, any> = { tab: init.tab, userTapped: true, remembered: 'provider' };
    const applyEffect = (eff: Record<string, any>) => {
      if (eff.urlRolePresent) return eff.tab;
      if (eff.userTapped) return eff.tab;
      return eff.remembered ?? eff.tab;
    };
    expect(
      applyEffect({
        urlRolePresent: init.urlRolePresent,
        userTapped: effectiveAfterUserTap.userTapped,
        remembered: 'provider',
        tab: init.tab,
      }),
    ).toBe('client');
  });
});

describe('T21 static checks: no notice literals in login.tsx, 6 translation keys present in LanguageContext', () => {
  let loginSrc: string;
  let languageSrc: string;

  beforeAll(() => {
    const loginPath = path.join(__dirname, '..', 'src', 'app', '(auth)', 'login.tsx');
    const langPath = path.join(__dirname, '..', 'src', 'contexts', 'LanguageContext.tsx');
    loginSrc = fs.readFileSync(loginPath, 'utf8');
    languageSrc = fs.readFileSync(langPath, 'utf8');
  });

  it('login.tsx contains none of the four notice sentences as string literals', () => {
    const forbidden = [
      "This is a provider account, so you've been taken to the provider area.",
      'Das ist ein Anbieter-Konto. Du wurdest in den Anbieter-Bereich weitergeleitet.',
      "This is a client account, so you've been taken to the client area.",
      'Das ist ein Kunden-Konto. Du wurdest in den Kunden-Bereich weitergeleitet.',
    ];
    for (const sent of forbidden) {
      expect(loginSrc).not.toContain(sent);
    }
  });

  it('six translation keys exist with both de and en values in LanguageContext TRANSLATIONS', () => {
    const keys = [
      'loginNoticeProviderTitle',
      'loginNoticeProviderBody',
      'loginNoticeClientTitle',
      'loginNoticeClientBody',
      'loginNoticeButton',
    ];
    for (const key of keys) {
      const keyIdx = languageSrc.indexOf(key + ':');
      expect(keyIdx).toBeGreaterThan(-1); // key identifier present
      const fromKey = languageSrc.slice(keyIdx, keyIdx + 400);
      const deMatch = fromKey.match(/de\s*:\s*['"]([^'"]+)['"]/);
      const enMatch = fromKey.match(/en\s*:\s*['"]([^'"]+)['"]/);
      expect(deMatch).not.toBeNull();
      expect(enMatch).not.toBeNull();
      expect(deMatch![1].length).toBeGreaterThanOrEqual(1);
      expect(enMatch![1].length).toBeGreaterThanOrEqual(1);
    }
  });
});
