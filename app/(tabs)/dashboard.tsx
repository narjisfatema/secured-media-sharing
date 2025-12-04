import { StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";

function MenuCard({
  title,
  icon,
  color,
  onPress,
}: {
  title: string;
  icon: any;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: color + "20" }]}
      onPress={onPress}
    >
      <IconSymbol name={icon} size={30} color={color} style={styles.cardIcon} />
      <ThemedText type="subtitle" style={[styles.cardTitle, { color }]}>
        {title}
      </ThemedText>
      <IconSymbol name="chevron.right" size={20} color={color} />
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  return (
    <ParallaxScrollView
      headerImage={<></>}
      headerBackgroundColor={{ dark: "", light: "" }}
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Dashboard</ThemedText>
      </ThemedView>

      <ThemedText>
        Welcome to the Secured Multimedia App! Here you can capture photos and
        videos that are securely watermarked and stored with blockchain
        verification.
      </ThemedText>

      <TouchableOpacity
  style={styles.button}
  onPress={() => router.push('/(tabs)/camera')}>
  <ThemedText style={styles.buttonText}>Get started</ThemedText>
</TouchableOpacity>

      <ThemedView style={styles.infoContainer}>
        <ThemedText type="defaultSemiBold">
          Blockchain Security Status:
        </ThemedText>
        <ThemedText>
          All captured media metadata is secured on the BSV blockchain, ensuring
          non-repudiation and traceability via the embedded watermark data.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    marginBottom: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cardIcon: {
    marginRight: 15,
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
  },
  infoContainer: {
    marginTop: 40,
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    gap: 8,
  },
  button: {
        backgroundColor: '#05621be4',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
        width: '50%',
        alignSelf: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

//the logic of above code is to create a dashboard screen for a secured multimedia app. 
// It uses a parallax scroll view to display a title, welcome message, and blockchain security status. 
// A "Get started" button navigates users to the camera screen. 
// The MenuCard component is defined but not used in this snippet; it could be used for additional menu options in the future. 
// The styles object defines the styling for various components in the dashboard screen.
// The useRouter hook from expo-router is used for navigation between screens.
// The ThemedView and ThemedText components are used for consistent theming across the app.
// The TouchableOpacity component is used to create a clickable button that navigates to the camera screen when pressed.
// The ParallaxScrollView component provides a scrollable view with a parallax effect for the header.
// The styles object defines the styling for various components in the dashboard screen.