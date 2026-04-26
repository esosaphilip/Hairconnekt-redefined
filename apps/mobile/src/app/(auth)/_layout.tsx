import { Stack } from 'expo-router';
import { colors } from '../../theme';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="splash" />
      <Stack.Screen name="account-type" />
      <Stack.Screen name="register" />
      <Stack.Screen name="login" />
      <Stack.Screen name="password-reset" />
      <Stack.Screen name="verify-email" />
    </Stack>
  );
}
