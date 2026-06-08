// src/theme/spacing.ts
// HairConnekt spacing and layout tokens — never hardcode pixel values

import { colors } from './colors';

export const spacing = {
  none: 0,
  unit: 1,
  xxxs: 2,
  xxs: 4,  // gap between icon and badge number
  xs:  8,  // chip inner padding, gap between tags
  s:   10,
  sm:  12, // inside stat cards, booking row gaps
  md:  16, // card internal padding (cardPaddingH, cardPaddingV)
  l:   20,
  lg:  24, // screen horizontal inset (screenPaddingH) — all screens
  xl:  32, // between major section blocks
  xl2: 40,
  xxl: 48,
  xxxl: 64,
  xxxxl: 80,
  xxxxxl: 100,
  xxxxxxl: 120,
  xxxxxxxl: 150,
};

export const layout = {
  inputHeight:    48,  // all TextInput components
  inputHeightMd:  50,  // modal and secondary text inputs
  buttonHeight:   56,  // primary buttons (Anmelden, Jetzt buchen, Weiter)
  buttonHeightSm: 36,  // secondary/outline buttons
  headerHeight:   60,  // top screen headers with back navigation
  tabBarHeight:   72,  // bottom navigation bar safe area
  iconButton:     40,  // compact header icon buttons
  badgeSm:        18,  // unread counters and status pills
  fabSize:        56,  // floating action button
  heroHeight:     220, // large profile hero banners
  avatarSm:       40,
  avatarMd:       64,
  avatarLg:       96,
  avatarXl:       120,
  textAreaHeight: 120,
};

export const borderRadius = {
  xs:   2,
  sm:   8,
  pill: 20,
  md:   16,
  lg:   24,
  full: 9999, // avatars, pills, toggle switches, badges
};

export const shadows = {
  card: {
    shadowColor:   colors.primary,
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius:  8,
    elevation:     3,
  },
  button: {
    shadowColor:   colors.coralShadow,
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius:  10,
    elevation:     5,
  },
};
