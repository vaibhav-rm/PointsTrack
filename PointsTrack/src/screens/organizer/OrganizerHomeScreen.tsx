import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useAuth } from '../../contexts/AuthContext';
import { fetchMyOrgEvents, fetchClubMembers, type OrgEvent } from '../../lib/api';
import type { AppNavigationProp } from '../../navigation/types';

// Organizer home: the app's equivalent of the web dashboard. Stats come from
// /events/mine (per-event counts ride along) plus pending join-request counts.
const OrganizerHomeScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user, memberships, isPresident, refreshMemberships } = useAuth();

  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const managedClubIds = memberships
    .filter((m) => m.membership.status === 'active' && (m.membership.role === 'owner' || m.membership.role === 'admin'))
    .map((m) => m.membership.clubId);
  const clubNames = memberships
    .filter((m) => m.membership.status === 'active')
    .map((m) => m.club.name);

  const load = useCallback(async () => {
    try {
      const [evts] = await Promise.all([
        fetchMyOrgEvents(),
        refreshMemberships(),
      ]);
      setEvents(evts);
      let pending = 0;
      await Promise.all(
        managedClubIds.map(async (clubId) => {
          try {
            const rows = await fetchClubMembers(clubId, 'pending');
            pending += rows.length;
          } catch {}
        })
      );
      setPendingRequests(pending);
    } catch (error) {
      console.error('Error loading organizer home:', error);
    } finally {
      setLoading(false);
    }
  }, [refreshMemberships, managedClubIds.join(',')]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const registrations = events.reduce((s, e) => s + (e.attendeeCount ?? 0), 0);
  const checkedIn = events.reduce((s, e) => s + (e.checkedInCount ?? 0), 0);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background dark:bg-darkBackground">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-darkBackground">
      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text className="text-textSecondary font-pmedium text-lg dark:text-gray-400">
          {isPresident ? 'President mode' : 'Organizer'}
        </Text>
        <Text className="text-2xl font-pbold text-textPrimary dark:text-white mb-1" numberOfLines={1}>
          {clubNames[0] ?? user?.email ?? 'My Club'}
        </Text>
        {isPresident && (
          <Text className="text-xs font-pregular text-textSecondary dark:text-gray-500 mb-4">
            You run {clubNames.length > 1 ? `${clubNames.length} clubs` : 'a club'} and keep your student account.
          </Text>
        )}

        <View className="flex-row gap-3 mb-4 mt-2">
          <View className="flex-1 bg-white dark:bg-darkCard p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
            <Text className="text-2xl font-pbold text-textPrimary dark:text-white">{events.length}</Text>
            <Text className="text-xs text-textSecondary dark:text-gray-400 font-pmedium">Events</Text>
          </View>
          <View className="flex-1 bg-white dark:bg-darkCard p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
            <Text className="text-2xl font-pbold text-textPrimary dark:text-white">{registrations}</Text>
            <Text className="text-xs text-textSecondary dark:text-gray-400 font-pmedium">Registered</Text>
          </View>
          <View className="flex-1 bg-white dark:bg-darkCard p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
            <Text className="text-2xl font-pbold text-success">{checkedIn}</Text>
            <Text className="text-xs text-textSecondary dark:text-gray-400 font-pmedium">Checked in</Text>
          </View>
        </View>

        {pendingRequests > 0 && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Clubs')}
            className="bg-amber-500/15 border border-amber-500/30 p-4 rounded-2xl mb-4 flex-row items-center"
          >
            <Ionicons name="people-outline" size={22} color="#F59E0B" />
            <Text className="text-amber-600 dark:text-amber-400 font-pmedium ml-3 flex-1">
              {pendingRequests} membership request{pendingRequests === 1 ? '' : 's'} to verify
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#F59E0B" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => navigation.navigate('CreateOrgEvent')}
          className="bg-primary dark:bg-indigo-500 p-4 rounded-2xl mb-3 flex-row items-center justify-center"
        >
          <Ionicons name="add-circle-outline" size={22} color="white" />
          <Text className="text-white font-pbold text-base ml-2">Create Event</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('OrgEvents')}
          className="bg-white dark:bg-darkCard p-4 rounded-2xl mb-3 border border-gray-100 dark:border-gray-800 flex-row items-center"
        >
          <Ionicons name="calendar-outline" size={22} color={isDark ? '#818CF8' : '#4F46E5'} />
          <Text className="text-textPrimary dark:text-white font-pmedium ml-3 flex-1">My Events</Text>
          <Ionicons name="chevron-forward" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Clubs')}
          className="bg-white dark:bg-darkCard p-4 rounded-2xl mb-3 border border-gray-100 dark:border-gray-800 flex-row items-center"
        >
          <Ionicons name="people-outline" size={22} color={isDark ? '#818CF8' : '#4F46E5'} />
          <Text className="text-textPrimary dark:text-white font-pmedium ml-3 flex-1">My Clubs & Requests</Text>
          <Ionicons name="chevron-forward" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default OrganizerHomeScreen;
