import { useState, useEffect } from "react";
import * as ScreenCapture from "expo-screen-capture";
import { Platform } from "react-native";


export function useScreenshotProtection() {
  const [isProtected, setIsProtected] = useState(false);

  useEffect(() => {
    enableProtection();
    return () => {
      disableProtection();
    };
  }, []);

  const enableProtection = async () => {
    try {
      if (Platform.OS === "web") return;

      await ScreenCapture.preventScreenCaptureAsync();
      setIsProtected(true);
      console.log("Screenshot protection ON");
    } catch (e) {
      console.log("Failed to enable", e);
    }
  };

  const disableProtection = async () => {
    try {
      await ScreenCapture.allowScreenCaptureAsync();
      setIsProtected(false);
    } catch (e) {
      console.log("Failed to disable", e);
    }
  };

  return { isProtected };
}
