import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { api } from '../../lib/api';
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
        const [orgProfile, eventsArray] = await Promise.all([
          api.get<any>(`/profile/organizer/${organizerId}`),
          api.get<any[]>(`/events/by-organizer/${organizerId}`),
        ]);
        setClub(orgProfile);
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

  // The club's brand accent themes this public page. Falls back to indigo.
  const accent = club.accentColor || '#4F46E5';
  const secondary = club.secondaryColor || accent;
  const coverStyle: 'gradient' | 'solid' = club.coverStyle === 'solid' ? 'solid' : 'gradient';
  const links: { type: string; url: string }[] = club.links || [];
  const gallery: string[] = club.gallery || [];
  const hiddenSections: string[] = club.hiddenSections || [];
  const shown = (key: string) => !hiddenSections.includes(key);

  const LINK_ICONS: Record<string, any> = {
    website: 'globe-outline',
    instagram: 'logo-instagram',
    whatsapp: 'logo-whatsapp',
    email: 'mail-outline',
    twitter: 'logo-twitter',
    linkedin: 'logo-linkedin',
    youtube: 'logo-youtube',
    facebook: 'logo-facebook',
  };
  const openLink = (l: { type: string; url: string }) => {
    let url = l.url.trim();
    if (l.type === 'email' && !url.startsWith('mailto:')) url = `mailto:${url}`;
    else if (l.type !== 'email' && !/^https?:\/\//i.test(url) && !url.startsWith('mailto:')) url = `https://${url}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-darkBackground" edges={['top']}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* Parallax Cover Header — image, or accent solid/gradient fallback */}
        <View className="relative w-full h-64">
          {club.coverImage ? (
             <Image source={{ uri: club.coverImage }} className="w-full h-full" resizeMode="cover" />
          ) : coverStyle === 'gradient' ? (
             <LinearGradient
               colors={[accent, secondary]}
               start={{ x: 0, y: 0 }}
               end={{ x: 1, y: 1 }}
               style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
             >
               <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.7)" />
             </LinearGradient>
          ) : (
             <View className="items-center justify-center h-full" style={{ backgroundColor: accent }}>
                <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.7)" />
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
             <View className="w-24 h-24 rounded-full bg-white dark:bg-darkCard absolute -top-12 left-6 border-4 overflow-hidden shadow-sm items-center justify-center" style={{ borderColor: accent }}>
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
               <Text className="font-psemibold text-sm mt-1 uppercase tracking-widest" style={{ color: accent }}>
                 {club.college || "Independent"}
               </Text>
               
               {shown('about') && club.bio && (
                 <Text className="text-textSecondary dark:text-gray-300 font-pregular text-sm mt-4 leading-relaxed">
                   {club.bio}
                 </Text>
               )}

               {/* Links */}
               {shown('links') && links.length > 0 && (
                 <View className="flex-row flex-wrap gap-2 mt-4">
                   {links.map((l, i) => (
                     <TouchableOpacity
                       key={i}
                       onPress={() => openLink(l)}
                       className="flex-row items-center px-3 py-2 rounded-full"
                       style={{ backgroundColor: `${accent}1A` }}
                     >
                       <Ionicons name={LINK_ICONS[l.type] || 'link-outline'} size={16} color={accent} />
                       <Text className="font-pmedium text-xs ml-1.5 capitalize" style={{ color: accent }}>{l.type}</Text>
                     </TouchableOpacity>
                   ))}
                 </View>
               )}
             </View>

             {shown('stats') && (club.establishedDate || club.coreTeam) && (
               <View className="h-px w-full bg-gray-100 dark:bg-gray-800 my-5" />
             )}

             {/* Dynamic Custom Stats */}
             {shown('stats') && (
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
             )}
           </View>
        </View>

        {/* Pinned announcement */}
        {shown('announcement') && club.announcement ? (
          <View className="px-6 mt-4">
            <TouchableOpacity
              activeOpacity={club.announcementLink ? 0.7 : 1}
              onPress={() => club.announcementLink && Linking.openURL(club.announcementLink)}
              className="flex-row items-center p-4 rounded-2xl"
              style={{ backgroundColor: `${accent}14`, borderWidth: 1, borderColor: `${accent}40` }}
            >
              <Ionicons name="megaphone" size={20} color={accent} />
              <Text className="flex-1 ml-3 font-pmedium text-sm text-textPrimary dark:text-white">{club.announcement}</Text>
              {club.announcementLink ? <Ionicons name="chevron-forward" size={18} color={accent} /> : null}
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Photo gallery */}
        {shown('gallery') && gallery.length > 0 ? (
          <View className="pt-6">
            <View className="flex-row items-center mb-3 px-6">
              <View className="w-1 h-5 rounded-full mr-2" style={{ backgroundColor: accent }} />
              <Text className="text-xl font-pbold text-textPrimary dark:text-white">Gallery</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
              {gallery.map((uri, i) => (
                <Image key={i} source={{ uri }} className="w-40 h-40 rounded-2xl mr-3 bg-gray-100 dark:bg-gray-800" resizeMode="cover" />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Organized Events Section */}
        {shown('events') && (
        <View className="pt-8 px-6">
          <View className="flex-row items-center mb-4">
            <View className="w-1 h-5 rounded-full mr-2" style={{ backgroundColor: accent }} />
            <Text className="text-xl font-pbold text-textPrimary dark:text-white">Activities & Events</Text>
          </View>
          
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
                  onPress={() => navigation.navigate('EventDetails', { event })}
                  className="bg-white dark:bg-darkCard p-4 rounded-2xl mb-4 border border-gray-100 dark:border-gray-800 shadow-sm"
                  activeOpacity={0.7}
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 mr-2">
                       <Text className="text-lg font-psemibold text-textPrimary dark:text-white leading-tight">{event.title}</Text>
                       <Text className="font-pmedium text-xs mt-1 uppercase tracking-wider" style={{ color: accent }}>{event.type}</Text>
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
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
