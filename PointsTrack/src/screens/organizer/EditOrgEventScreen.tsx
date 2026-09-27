import { View, Text, ScrollView, Alert, TouchableOpacity, Switch } from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { api } from '../../lib/api';
import Input from '../../components/Input';
import Button from '../../components/Button';
import type { AppNavigationProp, AppStackParamList } from '../../navigation/types';

type EditOrgEventRouteProp = RouteProp<AppStackParamList, 'EditOrgEvent'>;

// Organizer event editing (owner-only, enforced server-side): same fields as
// creation. Points/capacity edits apply to future check-ins only — already
// awarded snapshots (attendee.pointsAwarded) are never rewritten.
const EditOrgEventScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { event } = useRoute<EditOrgEventRouteProp>().params;
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [title, setTitle] = useState(event.title ?? '');
  const [description, setDescription] = useState(event.description ?? '');
  const [date, setDate] = useState((event.startDate || event.date || '').split('T')[0]);
  const [time, setTime] = useState(event.startTime ?? '');
  const [location, setLocation] = useState(event.location ?? '');
  const [points, setPoints] = useState(String(event.points ?? 10));
  const [capacity, setCapacity] = useState(String(event.capacity ?? 0));
  const [openToAll, setOpenToAll] = useState(!!event.openToAll);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !date.trim()) {
      Alert.alert('Error', 'Title and date are required.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      Alert.alert('Error', 'Date must look like 2026-10-05.');
      return;
    }
    setLoading(true);
    try {
      await api.put(`/events/${event.id}`, {
        title: title.trim(),
        description: description.trim() || undefined,
        startDate: date.trim(),
        startTime: time.trim() || undefined,
        location: location.trim() || undefined,
        points: Math.max(0, parseInt(points, 10) || 0),
        capacity: Math.max(0, parseInt(capacity, 10) || 0),
        openToAll,
      });
      Alert.alert('Success', 'Event updated.');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not update event.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-darkBackground" edges={['top', 'bottom']}>
      <View className="px-6 py-4 flex-row items-center border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color={isDark ? 'white' : 'black'} />
        </TouchableOpacity>
        <Text className="text-xl font-pbold text-textPrimary dark:text-white">Edit Event</Text>
      </View>

      <ScrollView className="px-6 py-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <Input label="Title *" value={title} onChangeText={setTitle} placeholder="Event title" />
        <Input label="Description" value={description} onChangeText={setDescription} placeholder="What will happen?" multiline numberOfLines={3} style={{ height: 90, textAlignVertical: 'top' }} />
        <View className="flex-row gap-4">
          <View className="flex-1">
            <Input label="Date (YYYY-MM-DD) *" value={date} onChangeText={setDate} placeholder="2026-10-05" />
          </View>
          <View className="flex-1">
            <Input label="Time (HH:MM)" value={time} onChangeText={setTime} placeholder="10:00" />
          </View>
        </View>
        <Input label="Location" value={location} onChangeText={setLocation} placeholder="Main Auditorium" />
        <View className="flex-row gap-4">
          <View className="flex-1">
            <Input label="Points" value={points} onChangeText={setPoints} placeholder="10" keyboardType="numeric" />
          </View>
          <View className="flex-1">
            <Input label="Capacity (0 = unlimited)" value={capacity} onChangeText={setCapacity} placeholder="0" keyboardType="numeric" />
          </View>
        </View>

        <View className="flex-row justify-between items-center bg-white dark:bg-darkCard p-4 rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
          <View className="flex-1 mr-3">
            <Text className="text-base font-pmedium text-textPrimary dark:text-white">Open to all colleges</Text>
          </View>
          <Switch value={openToAll} onValueChange={setOpenToAll} />
        </View>

        <Button title={loading ? 'Saving…' : 'Save Changes'} onPress={handleSubmit} isLoading={loading} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditOrgEventScreen;
