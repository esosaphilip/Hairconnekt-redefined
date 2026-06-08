// src/theme/index.ts
// Re-export all design tokens
// CORRECT usage: import { colors, spacing, fonts } from '@/theme'
// WRONG:  backgroundColor: colors.primary  (never hardcode hex/pixels)

export * from './colors';
export * from './typography';
export * from './spacing';

import { StyleSheet } from 'react-native';
/** Convenience alias — use like StyleSheet.create */
export const themed = StyleSheet.create;
