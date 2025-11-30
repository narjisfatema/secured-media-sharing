import { Stack } from 'expo-router';


export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" /> {/* This will be your index screen */}
      <Stack.Screen name="auth" options={{ headerShown: true, title: 'Sign In' }} />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
