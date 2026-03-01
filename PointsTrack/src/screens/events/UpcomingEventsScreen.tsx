import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useState, useEffect, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  type: string;
  points: number;
  description?: string;
  startDate?: string;
}

const CATEGORIES = ['All', 'Activity', 'Workshop', 'Seminar', 'Competition'];

const UpcomingEventsScreen = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation<any>();
  
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [appliedEventIds, setAppliedEventIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All');

  useEffect(() => {
    if (!auth.currentUser) return;
    
    // 1. Listen to the user's applied events
    const attendeesQuery = query(
      collection(db, 'attendees'),
      where('attendeeUid', '==', auth.currentUser.uid)
    );

    const unsubscribeAttendees = onSnapshot(attendeesQuery, (snapshot) => {
      const ids = new Set<string>();
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.eventId) ids.add(data.eventId);
      });
      setAppliedEventIds(ids);
    });

    return () => unsubscribeAttendees();
  }, []);

  useEffect(() => {
    // 2. Listen to ALL upcoming events
    const eventsQuery = query(
      collection(db, 'upcoming_events'),
      orderBy('date', 'asc') // Sort chronologically by legacy date/time string
    );

    const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
      const eventsData: UpcomingEvent[] = [];
      snapshot.forEach((doc) => {
        // We no longer filter out applied events here!
        eventsData.push({ id: doc.id, ...doc.data() } as UpcomingEvent);
      });
      setEvents(eventsData);
      setLoading(false);
    });

    return () => unsubscribeEvents();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filteredAndSortedEvents = useMemo(() => {
    // 1. Filter by category
    let result = events;
    if (selectedFilter !== 'All') {
      result = events.filter(e => e.type === selectedFilter);
    }

    // 2. Sort so applied events are visually grouped at the bottom
    return result.sort((a, b) => {
       const aApplied = appliedEventIds.has(a.id);
       const bApplied = appliedEventIds.has(b.id);
       
       if (aApplied && !bApplied) return 1;
       if (!aApplied && bApplied) return -1;
       return 0; // maintain chronological order within groups
    });
  }, [events, appliedEventIds, selectedFilter]);

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-darkBackground">
      {/* Header */}
      <View className="px-6 py-4 flex-row justify-between items-center bg-white dark:bg-darkCard border-b border-gray-100 dark:border-gray-800 z-10">
        <Text className="text-2xl font-pbold text-textPrimary dark:text-white">Upcoming</Text>
        <View className="bg-primary/10 dark:bg-primary/20 p-2 rounded-full">
          <Ionicons name="calendar" size={20} color={isDark ? '#818CF8' : '#4F46E5'} />
        </View>
      </View>

      {/* Category Pills */}
      <View className="bg-white dark:bg-darkCard border-b border-gray-100 dark:border-gray-800 z-10">
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="py-3 px-6"
          contentContainerStyle={{ paddingRight: 32 }}
        >
          {CATEGORIES.map(category => {
            const isSelected = selectedFilter === category;
            return (
              <TouchableOpacity
                key={category}
                onPress={() => setSelectedFilter(category)}
                className={`mr-3 px-4 py-2 rounded-full border ${
                  isSelected 
                    ? 'bg-primary border-primary' 
                    : 'bg-transparent border-gray-200 dark:border-gray-700'
                }`}
              >
                <Text className={`font-pmedium text-sm ${
                  isSelected ? 'text-white' : 'text-textSecondary dark:text-gray-400'
                }`}>
                  {category}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      <ScrollView 
        className="flex-1 px-6 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#ffffff' : '#4F46E5'} />
        }
      >
        <Text className="text-textSecondary font-pregular mb-4 dark:text-gray-400">
          Discover college events where you can earn activity points.
        </Text>

        {loading ? (
          <View className="mt-10 items-center justify-center">
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : filteredAndSortedEvents.length === 0 ? (
          <View className="mt-10 items-center justify-center p-8 bg-white dark:bg-darkCard rounded-3xl border border-gray-100 dark:border-gray-800 border-dashed">
            <Ionicons name="calendar-clear-outline" size={60} color={isDark ? '#475569' : '#CBD5E1'} />
            <Text className="text-lg font-psemibold text-textSecondary dark:text-gray-400 mt-4 text-center">No Events Found</Text>
            <Text className="text-sm font-pregular text-gray-400 dark:text-gray-500 mt-2 text-center">Try adjusting your filters or check back later.</Text>
          </View>
        ) : (
          <View className="pb-20">
            {filteredAndSortedEvents.map((event) => {
              const isApplied = appliedEventIds.has(event.id);

              return (
                <TouchableOpacity 
                  key={event.id}
                  onPress={() => navigation.navigate('EventDetails', { event })}
                  activeOpacity={0.7}
                  className={`bg-white dark:bg-darkCard p-4 rounded-2xl mb-4 border border-gray-100 dark:border-gray-800 shadow-sm ${isApplied ? 'opacity-80' : ''}`}
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 mr-2">
                      <Text className="text-lg font-psemibold text-textPrimary dark:text-white leading-tight">{event.title}</Text>
                      <Text className="text-primary font-pmedium text-xs mt-1 dark:text-indigo-400 uppercase tracking-wider">{event.type}</Text>
                    </View>
                    <View className="items-end">
                      <View className="bg-success/10 dark:bg-success/20 px-3 py-1 rounded-full items-center justify-center mb-1">
                         <Text className="text-success font-pbold text-sm">+{event.points} Points</Text>
                      </View>
                      {/* Applied Badge */}
                      {isApplied && (
                        <View className="bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full flex-row items-center">
                           <Ionicons name="checkmark-circle" size={12} color={isDark ? '#34d399' : '#059669'} />
                           <Text className="text-emerald-700 dark:text-emerald-400 font-pmedium text-xs ml-1">Applied</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {event.description && (
                    <Text className="text-textSecondary dark:text-gray-400 font-pregular text-sm mb-3 line-clamp-2">
                      {event.description}
                    </Text>
                  )}

                  <View className="flex-row items-center border-t border-gray-100 dark:border-gray-800 pt-3 mt-1">
                    <View className="flex-row items-center mr-4">
                      <Ionicons name="calendar-outline" size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
                      <Text className="text-textSecondary dark:text-gray-300 font-pmedium text-xs ml-1">
                        {event.startDate || event.date.split('T')[0]}
                      </Text>
                    </View>
                    {event.location && (
                      <View className="flex-row items-center flex-1">
                        <Ionicons name="location-outline" size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
                        <Text className="text-textSecondary dark:text-gray-300 font-pmedium text-xs ml-1" numberOfLines={1}>
                          {event.location}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default UpcomingEventsScreen;
