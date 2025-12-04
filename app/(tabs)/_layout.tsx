import { Tabs } from 'expo-router';
import React from 'react';


import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';


export default function TabLayout() {
  const colorScheme = useColorScheme();


  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index" // corresponds to app/(tabs)/index.tsx
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="gallery" // corresponds to app/(tabs)/gallery.tsx
        options={{
          title: 'View your Media',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
<Tabs.Screen
  name="camera"
  options={{
    title: 'Camera',
    tabBarIcon: ({ color }) => <IconSymbol size={28} name="camera.fill" color={color} />,
  }}
/>
    </Tabs>
  );
}
//the logic of above code is to create a tab layout for the app with three tabs: Home, View your Media, and Camera. Each tab has its own icon and title, and the active tab's tint color is determined by the current color scheme (light or dark mode). The header is hidden for all tabs, and a custom HapticTab component is used for the tab bar buttons.
// The Tabs component from expo-router is used to manage the tab navigation.
// Each Tabs.Screen component defines a separate tab in the layout.
// The useColorScheme hook is used to get the current color scheme of the app.
// The IconSymbol component is used to render icons for each tab.
