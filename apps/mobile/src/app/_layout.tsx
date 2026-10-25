import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { ApiError } from '@cherri/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ShieldProvider } from '@/components/shield';
import { AuthProvider, useAuth } from '@/lib/auth';
import { colors, fonts } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

const subScreen = (title: string) => ({
  headerShown: true,
  title,
  headerTransparent: false,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.cream },
  headerTintColor: colors.ink,
  headerTitleStyle: { fontFamily: fonts.display, fontSize: 18 },
  headerBackButtonDisplayMode: 'minimal' as const,
});

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { status, user } = useAuth();
  const ready = fontsLoaded && status !== 'loading';

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  const signedIn = status === 'signedIn';
  const onboarded = Boolean(user?.onboarded);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="login" options={subScreen('Log in')} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="labs" options={subScreen('Lab decoder')} />
        <Stack.Screen name="report" options={subScreen('Doctor report')} />
        <Stack.Screen name="checks/index" options={subScreen('Health checks')} />
        <Stack.Screen name="checks/[type]" options={subScreen('Health check')} />
        <Stack.Screen name="learn" options={subScreen('Learn & myths')} />
        <Stack.Screen name="care" options={subScreen('Find care')} />
        <Stack.Screen name="pregnancy" options={subScreen('Pregnancy & baby')} />
        <Stack.Screen name="settings" options={subScreen('Settings')} />
        <Stack.Screen name="consult/index" options={subScreen('Consult a doctor')} />
        <Stack.Screen name="consult/[id]" options={subScreen('Consultation')} />
        <Stack.Screen name="meds" options={subScreen('Medicine guardian')} />
        <Stack.Screen name="ec" options={subScreen('Accident help')} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <ShieldProvider>
          <RootNavigator fontsLoaded={fontsLoaded} />
        </ShieldProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
