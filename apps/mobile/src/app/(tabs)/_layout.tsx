import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CherryMark } from '@/components/cherry';
import { colors, fonts } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const icon =
  (name: IconName, active: IconName) =>
  ({ color, focused }: { color: ColorValue; focused: boolean }) => <Ionicons name={focused ? active : name} size={23} color={color as string} />;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 11 },
        tabBarStyle: {
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: Math.max(insets.bottom, 12),
          height: 68,
          paddingTop: 6,
          paddingBottom: 8,
          borderRadius: 26,
          borderWidth: 2,
          borderTopWidth: 2,
          borderColor: colors.ink,
          backgroundColor: colors.paper,
        },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: icon('home-outline', 'home') }} />
      <Tabs.Screen name="log" options={{ title: 'Log', tabBarIcon: icon('create-outline', 'create') }} />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Ask',
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                marginTop: -26,
                width: 58,
                height: 58,
                borderRadius: 29,
                borderWidth: 2,
                borderColor: colors.ink,
                backgroundColor: focused ? colors.olive : colors.ochre,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CherryMark size={36} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="insights" options={{ title: 'Insights', tabBarIcon: icon('pulse-outline', 'pulse') }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: icon('grid-outline', 'grid') }} />
    </Tabs>
  );
}
