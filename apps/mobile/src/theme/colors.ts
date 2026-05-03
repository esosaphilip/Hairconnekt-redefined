// src/theme/colors.ts
// HairConnekt Design Tokens — extracted from Figma nDwVaZoQo7e6zpx8YijMSj
// DO NOT hardcode hex values anywhere else in the codebase

export const colors = {
  // Brand
  primary:       '#8B4513', // rich brown — headings, icons, accents
  primaryLight:  '#F5F0EB', // light brown tint — card backgrounds, section headers
  primaryDark:   '#5C2D00', // deep brown — active states

  // CTA
  coral:         '#E05A4E', // primary action buttons, unread badges
  coralLight:    'rgba(224, 90, 78, 0.1)',
  coralShadow:   'rgba(224, 90, 78, 0.25)',

  // Status
  gold:          '#C8860A', // ratings, premium badge
  teal:          '#1A8C85', // verified, success links, "Passwort vergessen"
  tealLight:     '#E8F5F4', // teal tint backgrounds
  green:         '#2E7D32', // available, confirmed, bestätigt
  greenLight:    '#E8F5E9', // green tint backgrounds
  orange:        '#E65100', // booking request alert — "Schnell antworten!"
  orangeLight:   '#FFF3E0', // orange tint for alerts

  // Neutral
  background:    '#FFFFFF', // screen backgrounds
  surface:       '#F5F5F5', // input fields, chips, tags
  surfaceCard:   '#FAFAFA', // stat card backgrounds
  border:        '#EEEEEE', // dividers, card borders
  borderStrong:  '#CCCCCC', // focused inputs
  overlay:       'rgba(0, 0, 0, 0.5)',
  overlaySoft:   'rgba(0, 0, 0, 0.35)',

  // Text
  textPrimary:   '#1A1A1A', // all headings and body text
  textSecondary: '#6B6B6B', // secondary labels, meta info, timestamps
  textTertiary:  '#AAAAAA', // placeholder text, disabled states, char count

  // Error / Destructive
  error:         '#C62828',
  errorLight:    'rgba(198, 40, 40, 0.1)',
};
