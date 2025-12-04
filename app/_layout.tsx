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

//the logic of above code is to set up the root layout for the app using a stack navigator from expo-router.
// It defines three screens: Dashboard (the main screen), auth (for user authentication with a visible header), and (tabs) (which contains the tab navigation).
// The header is hidden for the Dashboard and tab screens, while it is shown for the auth screen with the title 'Sign In'.
// The Stack component manages the navigation between these screens.