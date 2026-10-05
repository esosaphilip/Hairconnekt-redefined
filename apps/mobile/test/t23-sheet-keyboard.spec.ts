import * as fs from 'fs';
import * as path from 'path';
import { sheetKeyboardProps } from '../src/utils/sheetKeyboard';

describe('T23 sheetKeyboardProps behavior and offsets per platform', () => {
  it('sheetKeyboardProps for android with topInset 24 returns behavior "padding" and offset 24', () => {
    const result = sheetKeyboardProps({ platform: 'android', topInset: 24 });
    expect(result.behavior).toBe('padding');
    expect(result.keyboardVerticalOffset).toBe(24);
  });

  it('sheetKeyboardProps for android with topInset 0 returns offset 0', () => {
    const result = sheetKeyboardProps({ platform: 'android', topInset: 0 });
    expect(result.keyboardVerticalOffset).toBe(0);
  });

  it('sheetKeyboardProps for android ignores iosOffset (topInset 24, iosOffset 80 yields offset 24)', () => {
    const result = sheetKeyboardProps({ platform: 'android', topInset: 24, iosOffset: 80 });
    expect(result.keyboardVerticalOffset).toBe(24);
  });

  it('sheetKeyboardProps for android clamps NaN topInset to offset 0', () => {
    const result = sheetKeyboardProps({ platform: 'android', topInset: NaN });
    expect(result.keyboardVerticalOffset).toBe(0);
  });

  it('sheetKeyboardProps for android clamps negative topInset -5 to offset 0', () => {
    const result = sheetKeyboardProps({ platform: 'android', topInset: -5 });
    expect(result.keyboardVerticalOffset).toBe(0);
  });

  it('sheetKeyboardProps for ios with iosOffset 80 returns behavior "padding" and offset 80 regardless of topInset', () => {
    const result = sheetKeyboardProps({ platform: 'ios', topInset: 47, iosOffset: 80 });
    expect(result.behavior).toBe('padding');
    expect(result.keyboardVerticalOffset).toBe(80);
  });

  it('sheetKeyboardProps for ios with no iosOffset falls back to offset 0', () => {
    const result = sheetKeyboardProps({ platform: 'ios', topInset: 47 });
    expect(result.keyboardVerticalOffset).toBe(0);
  });
});

describe('T23 static source checks for BUG-062 edits', () => {
  const mobileRoot = path.resolve(__dirname, '..');
  const reviewsPath = path.join(
    mobileRoot,
    'src',
    'app',
    '(provider)',
    'reviews.tsx',
  );
  const apptPath = path.join(
    mobileRoot,
    'src',
    'app',
    '(provider)',
    'appointments',
    '[id].tsx',
  );

  const reviewsSrc = fs.readFileSync(reviewsPath, 'utf8');
  const apptSrc = fs.readFileSync(apptPath, 'utf8');

  it('provider reviews.tsx imports and calls sheetKeyboardProps and useSafeAreaInsets', () => {
    expect(reviewsSrc).toContain('sheetKeyboardProps(');
    expect(reviewsSrc).toContain('useSafeAreaInsets');
  });

  it('provider appointments/[id].tsx imports and calls sheetKeyboardProps and useSafeAreaInsets', () => {
    expect(apptSrc).toContain('sheetKeyboardProps(');
    expect(apptSrc).toContain('useSafeAreaInsets');
  });

  it('provider reviews.tsx does not contain the old ternary "? \'padding\' : \'height\'"', () => {
    expect(reviewsSrc).not.toContain("? 'padding' : 'height'");
  });

  it('provider reviews.tsx does not contain the old ternary "? \'padding\' : undefined"', () => {
    expect(reviewsSrc).not.toContain("? 'padding' : undefined");
  });

  it('provider appointments/[id].tsx does not contain the old ternary "? \'padding\' : \'height\'"', () => {
    expect(apptSrc).not.toContain("? 'padding' : 'height'");
  });

  it('provider appointments/[id].tsx does not contain the old ternary "? \'padding\' : undefined"', () => {
    expect(apptSrc).not.toContain("? 'padding' : undefined");
  });

  it('provider appointments/[id].tsx still preserves BUG-057 wording keys cancelProviderNote and cancelProviderNoteUrgent', () => {
    expect(apptSrc).toContain('cancelProviderNote');
    expect(apptSrc).toContain('cancelProviderNoteUrgent');
  });

  it('provider appointments/[id].tsx ProviderAppointment type still preserves the isMobile?: boolean field', () => {
    expect(apptSrc).toContain('isMobile?: boolean');
  });
});
