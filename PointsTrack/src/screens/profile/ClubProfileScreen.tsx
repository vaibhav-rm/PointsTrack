import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { AppNavigationProp, AppStackParamList } from '../../navigation/types';

type ClubProfileScreenRouteProp = RouteProp<AppStackParamList, 'ClubProfile'>;

export default function ClubProfileScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<ClubProfileScreenRouteProp>();
  const { organizerId } = route.params;
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [club, setClub] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // 1. Fetch Organizer Profile Data
        const orgDoc = await getDoc(doc(db, 'organizers', organizerId));
        if (orgDoc.exists()) {
          setClub({ id: orgDoc.id, ...orgDoc.data() });
        }

        // 2. Fetch Organizer's Upcoming Events
        const eventsQuery = query(
          collection(db, 'upcoming_events'),
          where('organizerId', '==', organizerId)
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        
        let eventsArray: any[] = [];
        eventsSnapshot.forEach(doc => {
          eventsArray.push({ id: doc.id, ...doc.data() });
        });
        
        // Manual sort since compound idx wasn't built for targetCollege / date
        eventsArray.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setEvents(eventsArray);

      } catch (error) {
        console.error("Error fetching club profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [organizerId]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background dark:bg-darkBackground">
        <ActivityIndicator size="large" color={isDark ? '#818CF8' : '#4F46E5'} />
      </SafeAreaView>
    );
  }

  if (!club) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background dark:bg-darkBackground">
        <Text className="text-textSecondary dark:text-gray-400 font-pmedium">Club profile not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-darkBackground" edges={['top']}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        
        {/* Parallax Cover Header */}
        <View className="relative w-full h-64 bg-gray-200 dark:bg-gray-800">
          {club.coverImage ? (
             <Image source={{ uri: club.coverImage }} className="w-full h-full" resizeMode="cover" />
          ) : (
             <View className="items-center justify-center h-full opacity-50">
                <Ionicons name="image-outline" size={48} color={isDark ? '#4F46E5' : '#818CF8'} />
             </View>
          )}

          {/* Absolute Back Button */}
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/40 items-center justify-center backdrop-blur-md"
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Profile Card Overlay */}
        <View className="px-6 -mt-16 relative z-10">
           <View className="bg-white dark:bg-darkCard rounded-3xl p-6 shadow-md border border-gray-100 dark:border-gray-800">
             
             {/* Logo Overlapping Border */}
             <View className="w-24 h-24 rounded-full bg-white dark:bg-darkCard absolute -top-12 left-6 border-4 border-white dark:border-darkCard overflow-hidden shadow-sm items-center justify-center">
               <Image 
                 source={{ uri: club.logo || 'https://via.placeholder.com/150' }} 
                 className="w-full h-full bg-gray-100 dark:bg-gray-800" 
                 resizeMode="cover" 
               />
             </View>

             {/* Profile Info Space */}
             <View className="pt-12">
               <Text className="text-2xl font-pblack text-textPrimary dark:text-white leading-tight">
                 {club.clubName || "Unknown Club"}
               </Text>
               <Text className="text-primary dark:text-indigo-400 font-psemibold text-sm mt-1 uppercase tracking-widest">
                 {club.college || "Independent"}
               </Text>
               
               {club.bio && (
                 <Text className="text-textSecondary dark:text-gray-300 font-pregular text-sm mt-4 leading-relaxed">
                   {club.bio}
                 </Text>
               )}
             </View>

             <View className="h-px w-full bg-gray-100 dark:bg-gray-800 my-5" />

             {/* Dynamic Custom Stats */}
             <View className="flex-row gap-4">
               {club.establishedDate && (
                 <View className="flex-1 bg-gray-50 dark:bg-gray-800/80 p-3 rounded-2xl">
                   <Ionicons name="calendar-outline" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                   <Text className="text-xs text-textSecondary dark:text-gray-400 font-pmedium mt-2">Established</Text>
                   <Text className="text-sm text-textPrimary dark:text-white font-pbold mt-0.5">{club.establishedDate}</Text>
                 </View>
               )}
               {club.coreTeam && (
                 <View className="flex-1 bg-gray-50 dark:bg-gray-800/80 p-3 rounded-2xl">
                   <Ionicons name="people-outline" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                   <Text className="text-xs text-textSecondary dark:text-gray-400 font-pmedium mt-2">Team</Text>
                   <Text className="text-sm text-textPrimary dark:text-white font-pbold mt-0.5 max-h-20" numberOfLines={3}>{club.coreTeam}</Text>
                 </View>
               )}
             </View>
           </View>
        </View>

        {/* Organized Events Section */}
        <View className="pt-8 px-6">
          <Text className="text-xl font-pbold text-textPrimary dark:text-white mb-4">Activities & Events</Text>
          
          {events.length === 0 ? (
            <View className="items-center justify-center p-8 bg-gray-50 dark:bg-darkCard rounded-3xl border border-gray-100 dark:border-gray-800 border-dashed mb-10">
              <Ionicons name="calendar-clear-outline" size={48} color={isDark ? '#475569' : '#CBD5E1'} />
              <Text className="text-base font-psemibold text-textSecondary dark:text-gray-400 mt-3">No Upcoming Activity</Text>
            </View>
          ) : (
            <View>
              {events.map((event) => (
                <TouchableOpacity 
                  key={event.id}
                  onPress={() => navigation.push('EventDetails', { event })}
                  className="bg-white dark:bg-darkCard p-4 rounded-2xl mb-4 border border-gray-100 dark:border-gray-800 shadow-sm"
                  activeOpacity={0.7}
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 mr-2">
                       <Text className="text-lg font-psemibold text-textPrimary dark:text-white leading-tight">{event.title}</Text>
                       <Text className="text-primary font-pmedium text-xs mt-1 dark:text-indigo-400 uppercase tracking-wider">{event.type}</Text>
                    </View>
                    <View className="bg-success/10 dark:bg-success/20 px-3 py-1 rounded-full items-center justify-center">
                       <Text className="text-success font-pbold text-xs">+{event.points} pts</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center mt-2 border-t border-gray-100 dark:border-gray-800 pt-3">
                     <Ionicons name="calendar-outline" size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
                     <Text className="text-textSecondary dark:text-gray-400 font-pmedium text-xs ml-1.5">{event.startDate || event.date.split('T')[0]}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
