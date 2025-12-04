import { Platform, StyleSheet } from 'react-native';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';


export default function TabTwoScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#6fcaeeff', dark: '#8cececff' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}>
          Gallery
        </ThemedText>
      </ThemedView>


      <ThemedText>This screen includes the media you have created</ThemedText>
     
     
    </ParallaxScrollView>
  );
}




const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});

//the logic of above code is to create a gallery screen within a parallax scroll view. 
// It displays a header image and a title "Gallery" using themed components for consistent styling. The screen informs users that it contains the media they have created. The styles object defines the styling for the header image and title container, ensuring proper layout and appearance across different platforms.
// The ParallaxScrollView component provides a scrollable view with a parallax effect for the header.
// The ThemedView and ThemedText components are used for consistent theming across the app.
// The IconSymbol component is used to render the header image icon.