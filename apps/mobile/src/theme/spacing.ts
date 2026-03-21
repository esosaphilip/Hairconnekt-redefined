// src/theme/spacing.ts
// HairConnekt spacing and layout tokens — never hardcode pixel values

export const spacing = {
  xxs: 4,  // gap between icon and badge number
  xs:  8,  // chip inner padding, gap between tags
  sm:  12, // inside stat cards, booking row gaps
  md:  16, // card internal padding (cardPaddingH, cardPaddingV)
  lg:  24, // screen horizontal inset (screenPaddingH) — all screens
  xl:  32, // between major section blocks
  xxl: 48,
};

export const layout = {
  inputHeight:    48,  // all TextInput components
  buttonHeight:   56,  // primary buttons (Anmelden, Jetzt buchen, Weiter)
  buttonHeightSm: 36,  // secondary/outline buttons
  tabBarHeight:   72,  // bottom navigation bar safe area
  fabSize:        56,  // floating action button
  avatarSm:       40,
  avatarMd:       64,
  avatarLg:       96,
  avatarXl:       120,
};

export const borderRadius = {
  sm:   8,
  md:   16,
  lg:   24,
  full: 9999, // avatars, pills, toggle switches, badges
};

export const shadows = {
  card: {
    shadowColor:   '#8B4513',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius:  8,
    elevation:     3,
  },
  button: {
    shadowColor:   'rgba(224, 90, 78, 0.25)',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius:  10,
    elevation:     5,
  },
};
