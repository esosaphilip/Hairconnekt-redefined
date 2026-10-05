export type SheetKeyboardProps = {
  behavior: 'padding';
  keyboardVerticalOffset: number;
};

export function sheetKeyboardProps(input: {
  platform: string;
  topInset: number;
  iosOffset?: number;
}): SheetKeyboardProps {
  const { platform, topInset, iosOffset } = input;
  let keyboardVerticalOffset: number;
  if (platform === 'android') {
    const safeTop =
      typeof topInset === 'number' && Number.isFinite(topInset) && topInset > 0
        ? topInset
        : 0;
    keyboardVerticalOffset = safeTop;
  } else {
    keyboardVerticalOffset = iosOffset ?? 0;
  }
  return {
    behavior: 'padding',
    keyboardVerticalOffset,
  };
}
