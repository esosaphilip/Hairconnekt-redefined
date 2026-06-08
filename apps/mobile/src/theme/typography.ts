// src/theme/typography.ts
// Fonts: Playfair Display (headings) + DM Sans (body)
// Load both in app/_layout.tsx via expo-google-fonts

export const fonts = {
  heading:     'PlayfairDisplay_700Bold',  // display/headings
  headingReg:  'PlayfairDisplay_400Regular',
  body:        'DMSans_400Regular',        // body copy, buttons, labels
  bodyMedium:  'DMSans_500Medium',
  bodyBold:    'DMSans_700Bold',
  mono:        'JetBrainsMono_400Regular', // booking numbers, codes
};

export const fontSizes = {
  xxs:  10, // tiny badges, helper labels
  xs:   12, // chip text, tags, badge counters
  sm:   14, // labels, sub-info
  md:   16, // input values, body text, button text
  lg:   18, // card provider name
  xl:   20, // screen section headings
  xxl:  24, // dashboard stat numbers
  xxxl: 28, // hero titles (Playfair Display)
  hero: 32, // Playfair large display
};

export const lineHeights = {
  xs:   16,
  sm:   20,
  md:   24,
  lg:   27,
  xl:   28,
  xxl:  32,
  xxxl: 33.6,
};
