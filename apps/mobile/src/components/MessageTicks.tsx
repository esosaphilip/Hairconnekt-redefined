import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme';

interface Props {
  isRead: boolean;
}

export function MessageTicks({ isRead }: Props) {
  const tickColor = isRead ? colors.teal : '#AAAAAA';
  return (
    <View style={styles.container}>
      <Feather name="check" size={12} color={tickColor} style={styles.firstTick} />
      <Feather name="check" size={12} color={tickColor} style={styles.secondTick} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 18,
    height: 14,
    position: 'relative',
  },
  firstTick: {
    position: 'absolute',
    left: 0,
  },
  secondTick: {
    position: 'absolute',
    left: 6,
  },
});
