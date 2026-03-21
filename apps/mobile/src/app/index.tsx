// app/index.tsx — Entry point: redirect to splash
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(auth)/splash" />;
}
