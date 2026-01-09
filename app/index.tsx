import { StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';


export default function indexScreen() {
    const router = useRouter();
    return (
        <ParallaxScrollView headerImage={<></>}
    headerBackgroundColor={{
      dark: '',
      light: ''
    }}>
            {
                <IconSymbol
                    size={200}
                    color="#1E90FF"
                    name="shield.checkerboard"
                    style={styles.headerImage}
                />
            }
            <ThemedView style={styles.container}>
                <ThemedText
                    type="title"
                    style={{
                        fontFamily: Fonts.rounded,
                        marginBottom: 10,
                    }}>
                    SPLASH SCREEN
                </ThemedText>
                <TouchableOpacity onPress={() => router.push('/auth')}>
                    <ThemedText type="subtitle" style={styles.tagline}>
                        Blockchain-based secured multimedia sharing, content provenance, preventing deepfakes
                    </ThemedText>
                </TouchableOpacity>
            </ThemedView>
        </ParallaxScrollView>
    );
}
const styles = StyleSheet.create({
    headerImage: {
        marginTop: 0,
    },
    container: {
        alignItems: 'center',
        padding: 20,
        justifyContent: 'center',
    },
    tagline: {
        textAlign: 'center',
        textDecorationLine: 'none',
        marginTop: 10,
        fontSize: 16,
    },
});


//the logic of above code is to set up the root layout for the app using a stack navigator from expo-router.
// It defines three screens: Dashboard (the main screen), auth (for user authentication with a visible header), and (tabs) (which contains the tab navigation).
// The header is hidden for the Dashboard and tab screens, while it is shown for the auth screen with the title 'Sign In'.
// The Stack component manages the navigation between these screens.
