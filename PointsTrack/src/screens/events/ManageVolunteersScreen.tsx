import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useColorScheme } from 'nativewind';
import { api } from '../../lib/api';
import { AppNavigationProp, AppStackParamList } from '../../navigation/types';

type Volunteer = { studentId: string; name: string; email: string; usn: string };

// Owner-only screen to authorise fellow students as scanners for an event.
const ManageVolunteersScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { eventId, eventTitle } = useRoute<RouteProp<AppStackParamList, 'ManageVolunteers'>>().params;
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    api
      .get<Volunteer[]>(`/events/${eventId}/volunteers`)
      .then(setVolunteers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    const value = input.trim();
    if (!value) return;
    setAdding(true);
    try {
      const by = value.includes('@') ? { email: value } : { usn: value };
      const v = await api.post<Volunteer>(`/events/${eventId}/volunteers`, by);
      setVolunteers((prev) => (prev.some((p) => p.studentId === v.studentId) ? prev : [v, ...prev]));
      setInput('');
    } catch (e: any) {
      Alert.alert('Could not add', e?.message || 'No student found with that USN/email.');
    } finally {
      setAdding(false);
    }
  };

  const remove = (v: Volunteer) => {
    Alert.alert('Remove volunteer', `Remove ${v.name} from this event?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.del(`/events/${eventId}/volunteers/${v.studentId}`);
            setVolunteers((prev) => prev.filter((p) => p.studentId !== v.studentId));
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Could not remove volunteer.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-darkBackground" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color={isDark ? '#E5E7EB' : '#111827'} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-pbold text-textPrimary dark:text-white" numberOfLines={1}>Volunteers</Text>
          <Text className="text-xs text-textSecondary dark:text-gray-400" numberOfLines={1}>{eventTitle}</Text>
        </View>
      </View>

      <View className="px-6 pt-4">
        <Text className="text-textSecondary dark:text-gray-400 font-pregular text-sm mb-3">
          Add students by USN or email. They can scan attendees for this event from their own app. You can always scan too.
        </Text>
        <View className="flex-row items-center gap-2 mb-5">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Student USN or email"
            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            autoCapitalize="none"
            className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-800 text-textPrimary dark:text-white"
          />
          <TouchableOpacity
            onPress={add}
            disabled={adding || !input.trim()}
            className={`px-5 py-3 rounded-xl bg-primary dark:bg-indigo-500 flex-row items-center ${adding || !input.trim() ? 'opacity-50' : ''}`}
          >
            {adding ? <ActivityIndicator color="white" /> : <Ionicons name="person-add" size={18} color="white" />}
            <Text className="text-white font-pbold ml-2">Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={isDark ? '#818CF8' : '#4F46E5'} className="mt-8" />
      ) : (
        <FlatList
          data={volunteers}
          keyExtractor={(v) => v.studentId}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-10 bg-gray-50 dark:bg-darkCard rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed">
              <Ionicons name="people-outline" size={40} color={isDark ? '#475569' : '#CBD5E1'} />
              <Text className="text-textSecondary dark:text-gray-400 font-pmedium mt-2">No volunteers yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className="flex-row items-center justify-between bg-white dark:bg-darkCard p-4 rounded-xl mb-2 border border-gray-100 dark:border-gray-800">
              <View className="flex-1 mr-2">
                <Text className="text-textPrimary dark:text-white font-psemibold" numberOfLines={1}>{item.name}</Text>
                <Text className="text-textSecondary dark:text-gray-400 text-xs" numberOfLines={1}>{item.usn} · {item.email}</Text>
              </View>
              <TouchableOpacity onPress={() => remove(item)} className="p-2">
                <Ionicons name="close-circle" size={22} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default ManageVolunteersScreen;
