import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { colors } from '../theme/colors';
import BootScreen from '../screens/BootScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import PaywallScreen from '../screens/PaywallScreen';
import HomeScreen from '../screens/HomeScreen';
import ProjectScreen from '../screens/ProjectScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProjectDetailScreen from '../screens/ProjectDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { usePaywall } from '../hooks/usePaywall';

export type RootStackParamList = {
  Boot: undefined;
  Onboarding: undefined;
  Paywall: undefined;
  Main: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  Project: { projectId: string };
};

export type HistoryStackParamList = {
  HistoryList: undefined;
  ProjectDetail: { projectId: string };
};

export type MainTabParamList = {
  Today: undefined;
  History: undefined;
  Profile: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const HistoryStack = createNativeStackNavigator<HistoryStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="Project" component={ProjectScreen} />
    </HomeStack.Navigator>
  );
}

function HistoryStackNavigator() {
  return (
    <HistoryStack.Navigator screenOptions={{ headerShown: false }}>
      <HistoryStack.Screen name="HistoryList" component={HistoryScreen} />
      <HistoryStack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
    </HistoryStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="Today"
        component={HomeStackNavigator}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚡</Text> }}
      />
      <Tabs.Screen
        name="History"
        component={HistoryStackNavigator}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📋</Text> }}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text> }}
      />
    </Tabs.Navigator>
  );
}

export default function RootNavigator() {
  const { activatePlus } = usePaywall();

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Boot" component={BootScreen} />
      <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
      <RootStack.Screen
        name="Paywall"
        children={() => <PaywallScreen onUpgrade={activatePlus} />}
      />
      <RootStack.Screen name="Main" component={MainTabs} />
    </RootStack.Navigator>
  );
}
