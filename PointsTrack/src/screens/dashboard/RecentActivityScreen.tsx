import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../../navigation/types';
import useEvents from '../../hooks/useEvents';
import { useColorScheme } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';

const RecentActivityScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { events, loading } = useEvents();

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-darkBackground" edges={['top', 'bottom']}>
      {/* Go Back Header */}
      <View className="px-6 py-4 flex-row items-center border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color={isDark ? 'white' : 'black'} />
        </TouchableOpacity>
        <Text className="text-xl font-pbold text-textPrimary dark:text-white">
          All Activity
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
        className="px-6 pt-4"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => {}} />}
      >
        <Text className="text-sm font-pmedium text-textSecondary dark:text-gray-400 mb-6 uppercase tracking-widest">
          Your Tracked History
        </Text>

        {events.length === 0 && !loading ? (
          <View className="items-center justify-center py-20 bg-gray-50 dark:bg-darkCard rounded-3xl border border-gray-100 dark:border-gray-800 border-dashed">
            <Ionicons name="receipt-outline" size={48} color={isDark ? '#475569' : '#CBD5E1'} />
            <Text className="text-textSecondary font-psemibold dark:text-gray-400 mt-4">No activity history.</Text>
            <Text className="text-textSecondary font-pregular text-sm mt-1 dark:text-gray-500 text-center px-8">When organizers approve your event registrations, those points will appear here!</Text>
          </View>
        ) : (
          <View>
            {events.map((event) => (
              <TouchableOpacity
                key={event.id}
                onPress={() => navigation.navigate('EventDetails', { event })}
                className="bg-white dark:bg-darkCard p-4 rounded-2xl mb-4 border border-gray-100 dark:border-gray-800 shadow-sm flex-row justify-between items-center"
                activeOpacity={0.7}
              >
                <View className="flex-1 mr-4">
                  <Text className="text-lg font-psemibold text-textPrimary dark:text-white leading-tight mb-1">{event.title}</Text>
                  <View className="flex-row items-center gap-2">
                     <Text className="text-primary font-pmedium text-xs dark:text-indigo-400 uppercase tracking-widest">{event.type}</Text>
                     <Text className="text-textSecondary font-pregular text-xs dark:text-gray-500">•</Text>
                     <Text className="text-textSecondary font-pregular text-xs dark:text-gray-400">{event.date.split('T')[0]}</Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-3">
                  {event.certificateUrl && (
                    <View className="bg-primary/5 dark:bg-primary/20 p-2 rounded-full border border-primary/10 dark:border-primary/30">
                      <Ionicons name="image-outline" size={16} color={isDark ? '#818CF8' : '#4F46E5'} />
                    </View>
                  )}
                  <View className="bg-success/10 dark:bg-success/20 px-3 py-1.5 rounded-full border border-success/20">
                    <Text className="text-success font-pbold text-sm">+{event.points}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default RecentActivityScreen;
