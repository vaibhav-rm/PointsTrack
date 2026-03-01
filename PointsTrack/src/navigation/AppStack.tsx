import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import AddEventScreen from '../screens/events/AddEventScreen';
import EditEventScreen from '../screens/events/EditEventScreen';
import EventDetailsScreen from '../screens/events/EventDetailsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import UpcomingEventsScreen from '../screens/events/UpcomingEventsScreen';
import { AppStackParamList } from './types';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform } from 'react-native';
import { useColorScheme } from 'nativewind';

import ClubProfileScreen from '../screens/profile/ClubProfileScreen';

const Tab = createBottomTabNavigator<AppStackParamList>();

const AppStack = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: any }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderTopColor: isDark ? '#334155' : '#F1F5F9',
          borderTopWidth: 1,
          elevation: 5,
          height: Platform.OS === 'ios' ? 85 : 60,
          paddingBottom: Platform.OS === 'ios' ? 25 : 12,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter-Medium',
          fontSize: 11,
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        tabBarActiveTintColor: isDark ? '#818CF8' : '#4F46E5', // Primary
        tabBarInactiveTintColor: isDark ? '#64748B' : '#94A3B8', // Slate colors
        tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
          let iconName: any;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'AddEvent') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'UpcomingEvents') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarShowLabel: route.name !== 'AddEvent',
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="UpcomingEvents" component={UpcomingEventsScreen} options={{ title: 'Events' }} />
      <Tab.Screen 
        name="AddEvent" 
        component={AddEventScreen} 
        options={{ 
          tabBarStyle: { display: 'none' },
        }} 
      />
      <Tab.Screen 
        name="EditEvent" 
        component={EditEventScreen} 
        options={{ 
          tabBarStyle: { display: 'none' },
          tabBarItemStyle: { display: 'none' },
          tabBarButton: () => null, // Hide from tab bar visually
        }} 
      />
      <Tab.Screen 
        name="EventDetails" 
        component={EventDetailsScreen} 
        options={{ 
          tabBarStyle: { display: 'none' },
          tabBarItemStyle: { display: 'none' },
          tabBarButton: () => null, // Hide from tab bar visually
        }} 
      />
      <Tab.Screen 
        name="ClubProfile" 
        component={ClubProfileScreen} 
        options={{ 
          tabBarStyle: { display: 'none' },
          tabBarItemStyle: { display: 'none' },
          tabBarButton: () => null, // Hide from tab bar visually
        }} 
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default AppStack;
