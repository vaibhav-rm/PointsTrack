import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import React, { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { fetchMyOrgEvents, deleteOrgEvent, type OrgEvent } from '../../lib/api';
import type { AppNavigationProp } from '../../navigation/types';

// The organizer's event list: counts ride along from /events/mine, tapping
// opens the shared EventDetails screen (owner-aware), scanning and
// volunteers included.
const OrgEventsScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setEvents(await fetchMyOrgEvents());
    } catch (error) {
      console.error('Error loading org events:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const confirmDelete = (eventId: string, title: string) => {
    Alert.alert('Delete Event', `Delete "${title}"? Registrations will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteOrgEvent(eventId);
            setEvents((prev) => prev.filter((e) => e.id !== eventId));
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'Could not delete event.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-darkBackground">
      <View className="px-6 py-4 flex-row justify-between items-center border-b border-gray-100 dark:border-gray-800">
        <Text className="text-2xl font-pbold text-textPrimary dark:text-white">My Events</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateOrgEvent')}
          className="bg-primary dark:bg-indigo-500 px-4 py-2 rounded-full flex-row items-center"
        >
          <Ionicons name="add" size={18} color="white" />
          <Text className="text-white font-pmedium ml-1">New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View className="mt-10 items-center">
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : events.length === 0 ? (
          <View className="mt-10 items-center p-8 bg-white dark:bg-darkCard rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
            <Ionicons name="calendar-clear-outline" size={56} color={isDark ? '#475569' : '#CBD5E1'} />
            <Text className="text-lg font-psemibold text-textSecondary dark:text-gray-400 mt-4">No events yet</Text>
            <Text className="text-sm text-gray-400 mt-1 text-center">Create your first event to start earning check-ins.</Text>
          </View>
        ) : (
          events.map((event) => (
            <TouchableOpacity
              key={event.id}
              onPress={() => navigation.navigate('EventDetails', { event })}
              className="bg-white dark:bg-darkCard p-4 rounded-2xl mb-4 border border-gray-100 dark:border-gray-800"
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1 mr-2">
                  <Text className="text-lg font-psemibold text-textPrimary dark:text-white" numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Text className="text-xs text-textSecondary dark:text-gray-400 font-pregular mt-1">
                    {(event.startDate || event.date || '').split('T')[0]}
                    {event.location ? ` • ${event.location}` : ''} • +{event.points} pts
                  </Text>
                  <Text className="text-xs font-pmedium text-textSecondary dark:text-gray-300 mt-2">
                    {event.attendeeCount ?? 0} registered
                    {(event.checkedInCount ?? 0) > 0 && (
                      <Text className="text-success"> • {event.checkedInCount} checked in</Text>
                    )}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => navigation.navigate('ScanAttendee', { eventId: event.id, eventTitle: event.title })}
                    className="bg-primary/10 dark:bg-primary/20 p-2.5 rounded-full"
                  >
                    <Ionicons name="qr-code-outline" size={18} color={isDark ? '#818CF8' : '#4F46E5'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => confirmDelete(event.id, event.title)}
                    className="bg-red-500/10 p-2.5 rounded-full"
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default OrgEventsScreen;
