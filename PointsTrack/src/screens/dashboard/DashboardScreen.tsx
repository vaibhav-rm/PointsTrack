import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Linking } from 'react-native';
import React, { useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../../navigation/types';
import useUserData from '../../hooks/useUserData';
import useEvents from '../../hooks/useEvents';
import ProgressRing from '../../components/ProgressRing';
import Button from '../../components/Button';
import { auth } from '../../firebase/config';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

const DashboardScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { colorScheme } = useColorScheme();
  const { userData, loading: userLoading } = useUserData();
  const { events, loading: eventsLoading } = useEvents();

  const totalPoints = useMemo(() => {
    return events.reduce((acc, event) => acc + (Number(event.points) || 0), 0);
  }, [events]);

  const requiredPoints = userData?.requiredPoints || 100;
  const progress = Math.min(totalPoints / requiredPoints, 1);
  const remainingPoints = Math.max(requiredPoints - totalPoints, 0);

  const onRefresh = () => {
    // Hooks handle real-time updates, but this could trigger a manual refetch if needed
  };

  const handleLogout = () => {
    auth.signOut();
  };

  if (userLoading || eventsLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <Text className="text-primary font-pmedium">Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-darkBackground">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
        className="px-6 pt-4"
        refreshControl={<RefreshControl refreshing={userLoading || eventsLoading} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-8">
          <View className="flex-1 mr-4">
            <Text className="text-textSecondary font-pmedium text-lg dark:text-gray-400">Hello,</Text>
            <Text className="text-2xl font-pbold text-textPrimary dark:text-white" numberOfLines={1} ellipsizeMode="tail">
              {userData?.name || 'Student'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <Text className="text-secondary font-pmedium">Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Section */}
        <View className="items-center mb-8">
          <ProgressRing progress={progress} radius={120} stroke={20} />
          <View className="mt-4 items-center">
            <Text className="text-textSecondary font-pmedium text-base dark:text-gray-400">
              {totalPoints} / {requiredPoints} Points
            </Text>
            {remainingPoints > 0 ? (
              <Text className="text-textSecondary font-pregular text-sm mt-1 dark:text-gray-500">
                {remainingPoints} more to go!
              </Text>
            ) : (
              <Text className="text-success font-pbold text-lg mt-1">
                Goal Reached! 🎉
              </Text>
            )}
          </View>
        </View>

        {/* Recent Events */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-xl font-pbold text-textPrimary dark:text-white">Recent Activity</Text>
          <TouchableOpacity>
            <Text className="text-secondary font-pmedium">View All</Text>
          </TouchableOpacity>
        </View>

        {events.length === 0 ? (
          <View className="items-center justify-center py-10 bg-white dark:bg-darkCard rounded-2xl border border-gray-100 dark:border-gray-800">
            <Text className="text-textSecondary font-pmedium dark:text-gray-400">No events added yet.</Text>
            <Text className="text-textSecondary font-pregular text-sm mt-1 dark:text-gray-500">Start tracking your activities!</Text>
          </View>
        ) : (
          <View>
            {events.map((event) => (
              <TouchableOpacity
                key={event.id}
                onPress={() => navigation.navigate('EventDetails', { event })}
                className="bg-white dark:bg-darkCard p-4 rounded-2xl mb-3 border border-gray-100 dark:border-gray-800 shadow-sm flex-row justify-between items-center"
              >
                <View className="flex-1">
                  <Text className="text-lg font-psemibold text-textPrimary dark:text-white">{event.title}</Text>
                  <Text className="text-textSecondary font-pregular text-sm dark:text-gray-400">{event.type} • {event.date}</Text>
                </View>
                <View className="flex-row items-center gap-3">
                  {event.certificateUrl ? (
                    <TouchableOpacity onPress={() => navigation.navigate('EventDetails', { event })} className="bg-primary/10 dark:bg-primary/20 p-2 rounded-full">
                      <Ionicons name="document-text" size={20} color={colorScheme === 'dark' ? '#818CF8' : '#4F46E5'} />
                    </TouchableOpacity>
                  ) : null}
                  <View className="bg-success/10 dark:bg-success/20 px-3 py-1 rounded-full">
                    <Text className="text-success font-pbold">+{event.points}</Text>
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

export default DashboardScreen;
