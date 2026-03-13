import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { MainTabParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import FieldScreen from '../screens/FieldScreen';
import SessionsScreen from '../screens/SessionsScreen';
import { Colors } from '../theme/colors';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A0A0A',
          borderTopColor: '#2A2A2A',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: '#666666',
        tabBarLabelStyle: {
          fontFamily: 'Courier New',
          fontSize: 10,
          letterSpacing: 1,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'HOME',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⌂</Text>,
        }}
      />
      <Tab.Screen
        name="Field"
        component={FieldScreen}
        options={{
          tabBarLabel: 'FIELD',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>◉</Text>,
        }}
      />
      <Tab.Screen
        name="Sessions"
        component={SessionsScreen}
        options={{
          tabBarLabel: 'SESSIONS',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>≡</Text>,
        }}
      />
    </Tab.Navigator>
  );
}
