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
import { useAuth } from '../contexts/AuthContext';

import ClubProfileScreen from '../screens/profile/ClubProfileScreen';
import RecentActivityScreen from '../screens/dashboard/RecentActivityScreen';
import ScanAttendeeScreen from '../screens/events/ScanAttendeeScreen';
import ManageVolunteersScreen from '../screens/events/ManageVolunteersScreen';
import SemesterWrappedScreen from '../screens/dashboard/SemesterWrappedScreen';
import OrganizerHomeScreen from '../screens/organizer/OrganizerHomeScreen';
import OrgEventsScreen from '../screens/organizer/OrgEventsScreen';
import CreateOrgEventScreen from '../screens/organizer/CreateOrgEventScreen';
import EditOrgEventScreen from '../screens/organizer/EditOrgEventScreen';
import ClubsScreen from '../screens/clubs/ClubsScreen';
import ClubMembersScreen from '../screens/clubs/ClubMembersScreen';

const Tab = createBottomTabNavigator<AppStackParamList>();

const HIDDEN = {
  tabBarStyle: { display: 'none' },
  tabBarItemStyle: { display: 'none' },
  tabBarButton: () => null,
} as const;

// Role-driven tabs:
// - Students: Dashboard, Events, [Organize if club staff], Clubs, Profile.
// - Presidents (students who own/run a club): all of the above + Organize.
// - Organizer accounts (no student profile): Organize, My Events, Clubs, Profile.
const AppStack = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user, profile, canOrganize } = useAuth();

  const isStudent = user?.role === 'student' && !!profile;

  return (
    <Tab.Navigator
      initialRouteName={isStudent ? 'Dashboard' : 'Organize'}
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
          } else if (route.name === 'UpcomingEvents' || route.name === 'OrgEvents') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Organize') {
            iconName = focused ? 'briefcase' : 'briefcase-outline';
          } else if (route.name === 'Clubs') {
            iconName = focused ? 'people' : 'people-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarShowLabel: route.name !== 'AddEvent',
      })}
    >
      {isStudent && <Tab.Screen name="Dashboard" component={DashboardScreen} />}
      <Tab.Screen
        name="RecentActivity"
        component={RecentActivityScreen}
        options={{
          tabBarStyle: { display: 'none' },
          tabBarItemStyle: { display: 'none' },
          tabBarButton: () => null, // Hide from tab bar visually
        }}
      />
      {isStudent && <Tab.Screen name="UpcomingEvents" component={UpcomingEventsScreen} options={{ title: 'Events' }} />}
      {canOrganize && <Tab.Screen name="Organize" component={OrganizerHomeScreen} options={{ title: 'Organize' }} />}
      {!isStudent && <Tab.Screen name="OrgEvents" component={OrgEventsScreen} options={{ title: 'Events' }} />}
      <Tab.Screen name="Clubs" component={ClubsScreen} options={{ title: 'Clubs' }} />
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
      <Tab.Screen
        name="ScanAttendee"
        component={ScanAttendeeScreen}
        options={{
          tabBarStyle: { display: 'none' },
          tabBarItemStyle: { display: 'none' },
          tabBarButton: () => null, // Hide from tab bar visually
        }}
      />
      <Tab.Screen
        name="ManageVolunteers"
        component={ManageVolunteersScreen}
        options={{
          tabBarStyle: { display: 'none' },
          tabBarItemStyle: { display: 'none' },
          tabBarButton: () => null, // Hide from tab bar visually
        }}
      />
      <Tab.Screen
        name="SemesterWrapped"
        component={SemesterWrappedScreen}
        options={{
          tabBarStyle: { display: 'none' },
          tabBarItemStyle: { display: 'none' },
          tabBarButton: () => null, // Hide from tab bar visually
        }}
      />
      <Tab.Screen name="CreateOrgEvent" component={CreateOrgEventScreen} options={HIDDEN} />
      <Tab.Screen name="EditOrgEvent" component={EditOrgEventScreen} options={HIDDEN} />
      <Tab.Screen name="ClubMembers" component={ClubMembersScreen} options={HIDDEN} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default AppStack;
