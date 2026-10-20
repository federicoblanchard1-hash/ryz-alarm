import {
  Geist_200ExtraLight,
  Geist_300Light,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  useFonts,
} from "@expo-google-fonts/geist";
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from "@expo-google-fonts/instrument-serif";
import { Stack, router, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { findActive } from "@/core/ring";
import { onNotificationActivity } from "@/services/notifications";
import { AuthProvider } from "@/state/auth";
import { StoreProvider, useStore } from "@/state/store";
import { colors } from "@/theme";

const WAKE_SCREENS = new Set(["/ring", "/check", "/morning"]);

/**
 * Opens the ringing screen (or "Are you awake?") whenever something is due:
 * on launch, when a notification arrives or is tapped, when the app comes
 * back to the foreground, and every second while it's open.
 */
function WakeRouter() {
  const { ready, data } = useStore();
  const pathname = usePathname();
  const latest = useRef({ ready, data, pathname });
  useLayoutEffect(() => {
    latest.current = { ready, data, pathname };
  });

  const check = useCallback(() => {
    const { ready: isReady, data: current, pathname: path } = latest.current;
    if (!isReady) return;
    const active = findActive(current, Date.now());
    if (!active) return;
    const target = active.type === "ring" ? "/ring" : "/check";
    if (path === target) return;
    if (WAKE_SCREENS.has(path)) router.replace(target);
    else router.push(target);
  }, []);

  useEffect(check, [ready, data, check]);
  useEffect(() => onNotificationActivity(check), [check]);
  useEffect(() => {
    const timer = setInterval(check, 1_000);
    const sub = AppState.addEventListener(
      "change",
      (state) => state === "active" && check(),
    );
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [check]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Geist_200ExtraLight,
    Geist_300Light,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
  });
  // A moment of black while the font loads; if it can't load, carry on with the system font.
  if (!fontsLoaded && !fontError)
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return (
    <GestureHandlerRootView style={styles.root}>
      <StoreProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <WakeRouter />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="alarm/[id]"
              options={{ presentation: "modal", headerShown: false }}
            />
            <Stack.Screen
              name="try-mission"
              options={{ presentation: "fullScreenModal", headerShown: false }}
            />
            <Stack.Screen
              name="ring"
              options={{
                presentation: "fullScreenModal",
                headerShown: false,
                gestureEnabled: false,
                animation: "fade",
              }}
            />
            <Stack.Screen
              name="check"
              options={{
                presentation: "fullScreenModal",
                headerShown: false,
                gestureEnabled: false,
                animation: "fade",
              }}
            />
            <Stack.Screen
              name="morning"
              options={{
                presentation: "fullScreenModal",
                headerShown: false,
                animation: "fade",
              }}
            />
            <Stack.Screen
              name="interests"
              options={{ presentation: "fullScreenModal", headerShown: false }}
            />
            <Stack.Screen name="article" options={{ headerShown: false }} />
            <Stack.Screen name="story/[id]" options={{ headerShown: false }} />
            <Stack.Screen
              name="news-settings"
              options={{ presentation: "modal", headerShown: false }}
            />
            <Stack.Screen
              name="welcome"
              options={{
                presentation: "fullScreenModal",
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="account"
              options={{ presentation: "fullScreenModal", headerShown: false }}
            />
            <Stack.Screen name="xp" options={{ presentation: "modal", headerShown: false }} />
            <Stack.Screen name="pro" options={{ presentation: "modal", headerShown: false }} />
            <Stack.Screen
              name="goals"
              options={{ presentation: "fullScreenModal", headerShown: false }}
            />
          </Stack>
        </AuthProvider>
      </StoreProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
