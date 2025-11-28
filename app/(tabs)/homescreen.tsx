import { StyleSheet } from 'react-native';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';


export default function HomeScreen() {
  return (
    <ParallaxScrollView headerImage={<></>} 
    headerBackgroundColor={{
      dark: '',
      light: ''
    }}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Menu</ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Try capturing media</ThemedText>
        <ThemedText type="subtitle">View your captured media</ThemedText>
        <ThemedText type="subtitle">Securely share media</ThemedText>
      </ThemedView>

        <ThemedView>
        <ThemedText>
          {`Tap the Explore tab to learn more about what's included in this starter app.`}
        </ThemedText>
      </ThemedView>

    </ParallaxScrollView>
  );
}


const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactindex: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
