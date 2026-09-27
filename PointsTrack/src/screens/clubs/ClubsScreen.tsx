import { View, Text, ScrollView, RefreshControl, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import React, { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchClubs,
  fetchMyMemberships,
  joinClub,
  leaveClub,
  type ClubItem,
  type MembershipRow,
} from '../../lib/api';
import type { AppNavigationProp } from '../../navigation/types';

// Student club hub: verified memberships (approved by the club), pending
// verification requests, plus browse/search to join new clubs.
const ClubsScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { refreshMemberships } = useAuth();

  const [mine, setMine] = useState<MembershipRow[]>([]);
  const [browse, setBrowse] = useState<ClubItem[]>([]);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    try {
      const [myRows, clubRows] = await Promise.all([
        fetchMyMemberships(true),
        fetchClubs(debounced ? { search: debounced } : undefined),
      ]);
      setMine(myRows);
      setBrowse(clubRows);
    } catch (error) {
      console.error('Error loading clubs:', error);
    } finally {
      setLoading(false);
    }
  }, [debounced]);

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

  const myClubIds = new Set(mine.map((m) => m.club.id));
  const myStatus = new Map(mine.map((m) => [m.club.id, m.membership]));

  const handleJoin = async (clubId: string) => {
    setActingId(clubId);
    try {
      await joinClub(clubId);
      Alert.alert('Requested', 'Your request was sent. The club will verify it.');
      await load();
      await refreshMemberships();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not request to join.');
    } finally {
      setActingId(null);
    }
  };

  const handleLeave = async (clubId: string, membershipId: string, name: string) => {
    Alert.alert('Leave Club', `Leave "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          setActingId(clubId);
          try {
            await leaveClub(clubId, membershipId);
            await load();
            await refreshMemberships();
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'Could not leave club.');
          } finally {
            setActingId(null);
          }
        },
      },
    ]);
  };

  const canManage = (clubId: string) => {
    const m = myStatus.get(clubId);
    return !!m && m.status === 'active' && (m.role === 'owner' || m.role === 'admin');
  };

  const statusBadge = (m: MembershipRow['membership']) => {
    if (m.status === 'active') {
      return (
        <View className="bg-success/15 px-2.5 py-1 rounded-full flex-row items-center">
          <Ionicons name="checkmark-circle" size={12} color="#10B981" />
          <Text className="text-success font-pmedium text-xs ml-1">Verified • {m.role}</Text>
        </View>
      );
    }
    return (
      <View className="bg-amber-500/15 px-2.5 py-1 rounded-full">
        <Text className="text-amber-600 dark:text-amber-400 font-pmedium text-xs">Pending verification</Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-darkBackground">
      <View className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <Text className="text-2xl font-pbold text-textPrimary dark:text-white">Clubs</Text>
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
        ) : (
          <>
            <Text className="text-sm font-pmedium text-textSecondary dark:text-gray-400 mb-3 uppercase tracking-widest">
              My Clubs ({mine.length})
            </Text>
            {mine.length === 0 ? (
              <Text className="text-sm text-gray-400 font-pregular mb-6">
                You're not part of any club yet — request to join one below.
              </Text>
            ) : (
              mine.map((row) => (
                <View
                  key={row.membership.id}
                  className="bg-white dark:bg-darkCard p-4 rounded-2xl mb-3 border border-gray-100 dark:border-gray-800"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 mr-2">
                      <Text className="text-base font-psemibold text-textPrimary dark:text-white" numberOfLines={1}>
                        {row.club.name}
                      </Text>
                      {!!row.club.college && (
                        <Text className="text-xs text-textSecondary dark:text-gray-400" numberOfLines={1}>
                          {row.club.college}
                        </Text>
                      )}
                    </View>
                    {statusBadge(row.membership)}
                  </View>
                  <View className="flex-row gap-2 mt-1">
                    {canManage(row.club.id) && (
                      <TouchableOpacity
                        onPress={() => navigation.navigate('ClubMembers', { clubId: row.club.id, clubName: row.club.name })}
                        className="px-3 py-1.5 rounded-full bg-primary/10 dark:bg-primary/20"
                      >
                        <Text className="text-primary dark:text-indigo-400 font-pmedium text-xs">Verify members</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => handleLeave(row.club.id, row.membership.id, row.club.name)}
                      disabled={actingId === row.club.id}
                      className="px-3 py-1.5 rounded-full bg-red-500/10"
                    >
                      <Text className="text-red-500 font-pmedium text-xs">Leave</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            <Text className="text-sm font-pmedium text-textSecondary dark:text-gray-400 mb-3 mt-4 uppercase tracking-widest">
              Find a Club
            </Text>
            <View className="flex-row items-center bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 mb-4">
              <Ionicons name="search-outline" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search clubs…"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                className="flex-1 ml-2 text-textPrimary dark:text-white font-pregular"
              />
            </View>

            {browse
              .filter((c) => !myClubIds.has(c.id))
              .map((club) => (
                <View
                  key={club.id}
                  className="bg-white dark:bg-darkCard p-4 rounded-2xl mb-3 border border-gray-100 dark:border-gray-800 flex-row items-center"
                >
                  <View className="flex-1 mr-2">
                    <Text className="text-base font-psemibold text-textPrimary dark:text-white" numberOfLines={1}>
                      {club.name}
                    </Text>
                    {!!club.college && (
                      <Text className="text-xs text-textSecondary dark:text-gray-400" numberOfLines={1}>
                        {club.college}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleJoin(club.id)}
                    disabled={actingId === club.id}
                    className="px-4 py-2 rounded-full bg-primary dark:bg-indigo-500"
                  >
                    <Text className="text-white font-pmedium text-xs">
                      {actingId === club.id ? '…' : 'Join'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ClubsScreen;
