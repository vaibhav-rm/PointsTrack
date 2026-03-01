import { View, Text, ScrollView, Image, TouchableOpacity, Linking, Alert, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppNavigationProp, AppStackParamList } from '../../navigation/types';

import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import useUserData from '../../hooks/useUserData';

type EventDetailsScreenRouteProp = RouteProp<AppStackParamList, 'EventDetails'>;

const EventDetailsScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<EventDetailsScreenRouteProp>();
  const { event } = route.params;
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { userData } = useUserData();
  
  const isCreator = auth.currentUser && (event.userId === auth.currentUser.uid || event.organizerId === auth.currentUser.uid);

  const [isApplying, setIsApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  useEffect(() => {
    // Check if user already applied
    const checkApplication = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, "attendees"), 
          where("eventId", "==", event.id),
          where("attendeeUid", "==", auth.currentUser.uid)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setHasApplied(true);
        }
      } catch (error) {
        console.error("Error checking application status:", error);
      }
    };
    checkApplication();
  }, [event.id]);

  const handleApply = async () => {
    if (!auth.currentUser || !userData) {
      Alert.alert("Error", "You must be logged in to apply.");
      return;
    }

    // Eligibility check for 'College Only'
    if (!event.openToAll && event.targetCollege && event.targetCollege !== userData.college) {
      Alert.alert("Not Eligible", "This event is restricted to students of " + event.targetCollege);
      return;
    }

    setIsApplying(true);
    try {
      await addDoc(collection(db, "attendees"), {
        attendeeUid: auth.currentUser.uid,
        name: userData.name,
        email: userData.email,
        eventId: event.id,
        event: event.title,
        organizerId: event.organizerId,
        status: 'pending',
        engagement: 'Pending',
        checkInTimestamp: serverTimestamp(),
        pointsAwarded: event.points || 10
      });
      
      setHasApplied(true);
      Alert.alert("Success", "You have successfully applied for this event. Points will be awarded upon organizer approval.");
    } catch (error) {
      console.error("Apply error", error);
      Alert.alert("Error", "Failed to apply for the event. Please try again.");
    } finally {
      setIsApplying(false);
    }
  };
  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-darkBackground" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="px-6 py-4 flex-row justify-between items-center border-b border-gray-100 dark:border-gray-800">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color={isDark ? 'white' : 'black'} />
          </TouchableOpacity>
          <Text className="text-xl font-pbold text-textPrimary dark:text-white" numberOfLines={1}>
            Activity Details
          </Text>
        </View>
        {isCreator && (
          <TouchableOpacity 
            onPress={() => navigation.navigate('EditEvent', { event })}
            className="bg-primary/10 dark:bg-primary/20 p-2 rounded-full"
          >
            <Ionicons name="pencil" size={20} color={isDark ? '#818CF8' : '#4F46E5'} />
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}>
        {/* Image Carousel Display */}
        {event.images && event.images.length > 0 ? (
          <View className="w-full aspect-video bg-gray-100 dark:bg-gray-900">
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} className="w-full h-full">
              {event.images.map((imgUrl: string, index: number) => (
                <View key={index} style={{ width: 400 }} className="h-full">
                  <Image source={{ uri: imgUrl }} className="w-full h-full" resizeMode="cover" />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : event.certificateUrl ? (
          <View className="w-full aspect-video bg-gray-100 dark:bg-gray-900">
            <Image 
              source={{ uri: event.certificateUrl }} 
              className="w-full h-full" 
              resizeMode="cover" 
            />
          </View>
        ) : (
          <View className="w-full h-32 bg-primary/10 dark:bg-darkCard items-center justify-center">
            <Ionicons name="images" size={48} color={isDark ? '#4F46E5' : '#818CF8'} />
            <Text className="text-secondary font-pmedium mt-2">No images uploaded</Text>
          </View>
        )}

        <View className="px-6 pt-6">
          {/* Title and Points */}
          <View className="flex-row justify-between items-start mb-6">
            <View className="flex-1 mr-4">
              <Text className="text-3xl font-pbold text-textPrimary dark:text-white leading-tight">
                {event.title}
              </Text>
              <View className="flex-row items-center mt-2 gap-2">
                <View className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                  <Text className="text-textSecondary dark:text-gray-300 font-pmedium text-sm">
                    {event.type}
                  </Text>
                </View>
                <View className="flex-row items-center bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                  <Ionicons name="calendar-outline" size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
                  <Text className="text-textSecondary dark:text-gray-300 font-pmedium text-sm ml-1">
                    {event.date}
                  </Text>
                </View>
              </View>
            </View>
            <View className="bg-success/10 dark:bg-success/20 px-4 py-3 rounded-2xl items-center shadow-sm border border-success/20">
              <Text className="text-success font-pbold text-2xl">+{event.points}</Text>
              <Text className="text-success font-pmedium text-[10px] uppercase tracking-wider mt-1">Points</Text>
            </View>
          </View>

          {/* Hosted By Promotion (Clickable) */}
          {event.organizerId && (
            <TouchableOpacity 
              onPress={() => navigation.navigate('ClubProfile', { organizerId: event.organizerId })}
              className="flex-row items-center bg-white dark:bg-darkCard p-3 rounded-2xl mb-6 shadow-sm border border-gray-100 dark:border-gray-800"
              activeOpacity={0.7}
            >
              <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mr-3 border border-gray-100 dark:border-gray-700 overflow-hidden">
                 <Image 
                   source={{ uri: event.clubLogo || 'https://via.placeholder.com/100' }} 
                   className="w-full h-full" 
                 />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-textSecondary dark:text-gray-400 font-pmedium mb-0.5 uppercase tracking-wider">Hosted By</Text>
                <Text className="text-base text-textPrimary dark:text-white font-pbold leading-tight" numberOfLines={1}>
                  {event.clubName || 'Organizer'}
                </Text>
              </View>
              <View className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 items-center justify-center">
                <Ionicons name="chevron-forward" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
              </View>
            </TouchableOpacity>
          )}

          {/* Description */}
          {event.description ? (
            <View className="mb-6">
              <Text className="text-textPrimary dark:text-white font-psemibold text-lg mb-2">
                Description
              </Text>
              <Text className="text-textSecondary dark:text-gray-400 font-pregular text-base leading-relaxed">
                {event.description}
              </Text>
            </View>
          ) : null}

          {/* Additional Details */}
          <View className="bg-gray-50 dark:bg-darkCard p-4 rounded-xl border border-gray-100 dark:border-gray-800 mb-8 space-y-4">
            {event.location && (
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 items-center justify-center mr-3">
                  <Ionicons name="location" size={16} color={isDark ? '#818CF8' : '#4F46E5'} />
                </View>
                <View>
                  <Text className="text-xs text-textSecondary dark:text-gray-400 font-pmedium">Location</Text>
                  <Text className="text-sm text-textPrimary dark:text-white font-psemibold">{event.location}</Text>
                </View>
              </View>
            )}
            
            {event.capacity !== undefined && (
              <View className="flex-row items-center mt-3">
                <View className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 items-center justify-center mr-3">
                  <Ionicons name="people" size={16} color={isDark ? '#818CF8' : '#4F46E5'} />
                </View>
                <View>
                  <Text className="text-xs text-textSecondary dark:text-gray-400 font-pmedium">Capacity</Text>
                  <Text className="text-sm text-textPrimary dark:text-white font-psemibold">{event.capacity} seats</Text>
                </View>
              </View>
            )}

            <View className="flex-row items-center mt-3">
              <View className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 items-center justify-center mr-3">
                <Ionicons name="globe" size={16} color={isDark ? '#818CF8' : '#4F46E5'} />
              </View>
              <View>
                <Text className="text-xs text-textSecondary dark:text-gray-400 font-pmedium">Eligibility</Text>
                <Text className="text-sm text-textPrimary dark:text-white font-psemibold">
                  {event.openToAll ? "Open To All Colleges" : "Internal College Students Only"}
                </Text>
              </View>
            </View>
          </View>

          {/* Open full image if it exists */}
          {event.certificateUrl && (
            <TouchableOpacity 
              onPress={() => Linking.openURL(event.certificateUrl!)}
              className="flex-row items-center justify-center bg-gray-100 dark:bg-darkCard py-4 rounded-xl border border-gray-200 dark:border-gray-800"
            >
              <Ionicons name="open-outline" size={20} color={isDark ? '#E5E7EB' : '#374151'} />
              <Text className="text-textPrimary dark:text-gray-200 font-pmedium ml-2 text-base">
                Open Original Image
              </Text>
            </TouchableOpacity>
          )}

        </View>
      </ScrollView>

      {/* Sticky Bottom Apply Button (Only for Upcoming Events from Organizers) */}
      {event.organizerId && (
        <View className="px-6 py-4 bg-background dark:bg-darkBackground border-t border-gray-100 dark:border-gray-800">
          <TouchableOpacity
            onPress={handleApply}
            disabled={hasApplied || isApplying}
            className={`w-full py-4 rounded-xl flex-row items-center justify-center shadow-sm ${
              hasApplied 
                ? 'bg-success/20' 
                : 'bg-primary dark:bg-indigo-500'
            } ${isApplying ? 'opacity-70' : ''}`}
          >
            {isApplying ? (
              <ActivityIndicator color="white" />
            ) : hasApplied ? (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text className="text-success font-pbold text-lg ml-2">Applied Successfully</Text>
              </>
            ) : (
              <Text className="text-white font-pbold text-lg">Apply for Event</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default EventDetailsScreen;
