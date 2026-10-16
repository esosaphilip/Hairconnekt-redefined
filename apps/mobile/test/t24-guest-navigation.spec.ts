import {
  GUEST_HOME_ROUTE,
  PROFILE_LOGIN_ROUTE,
  loginBackAction,
  profileTabPressDecision,
  signOutDestination,
} from '../src/utils/roleRouting';

describe('T24 profileTabPressDecision', () => {
  it('with a token the Profile tab press opens the profile screen', () => {
    expect(profileTabPressDecision(true)).toBe('open-profile');
  });

  it('without a token the Profile tab press opens the login screen', () => {
    expect(profileTabPressDecision(false)).toBe('open-login');
  });
});

describe('T24 signOutDestination', () => {
  it('sign-out always returns the guest client home route', () => {
    expect(signOutDestination()).toBe('/(client)');
  });

  it('sign-out destination equals GUEST_HOME_ROUTE', () => {
    expect(signOutDestination()).toBe(GUEST_HOME_ROUTE);
  });

  it('GUEST_HOME_ROUTE is the client group root', () => {
    expect(GUEST_HOME_ROUTE).toBe('/(client)');
  });
});

describe('T24 loginBackAction', () => {
  it('with navigation history the login back button pops', () => {
    expect(loginBackAction(true)).toBe('pop');
  });

  it('without navigation history the login back button goes to the guest home', () => {
    expect(loginBackAction(false)).toBe('go-guest-home');
  });
});

describe('T24 PROFILE_LOGIN_ROUTE', () => {
  it('targets the login screen', () => {
    expect(PROFILE_LOGIN_ROUTE.startsWith('/(auth)/login')).toBe(true);
  });

  it('carries returnTo back to the client profile', () => {
    expect(PROFILE_LOGIN_ROUTE).toContain('returnTo=/(client)/profile');
  });
});
