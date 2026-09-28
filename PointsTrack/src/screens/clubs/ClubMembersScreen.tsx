import { View, Text, ScrollView, RefreshControl, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import React, { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { fetchClubMembers, moderateMember, inviteClubMember, type ClubMemberRow } from '../../lib/api';
import type { AppNavigationProp, AppStackParamList } from '../../navigation/types';

type ClubMembersRouteProp = RouteProp<AppStackParamList, 'ClubMembers'>;

// Club verification desk: owners/admins approve or reject join requests and
// manage current members. The server enforces the permission + last-owner
// guard; the UI just reflects it.
const ClubMembersScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { clubId, clubName } = useRoute<ClubMembersRouteProp>().params;
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [members, setMembers] = useState<ClubMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    try {
      setMembers(await fetchClubMembers(clubId));
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not load members.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [clubId, navigation]);

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

  const act = async (membershipId: string, status: 'active' | 'rejected' | 'removed', label: string) => {
    setActingId(membershipId);
    try {
      await moderateMember(clubId, membershipId, status);
      setMembers((prev) =>
        status === 'removed'
          ? prev.filter((m) => m.membershipId !== membershipId)
          : prev.map((m) => (m.membershipId === membershipId ? { ...m, status } : m))
      );
      Alert.alert('Done', label);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Action failed.');
    } finally {
      setActingId(null);
    }
  };

  const pending = members.filter((m) => m.status === 'pending');
  const active = members.filter((m) => m.status === 'active');

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) {
      Alert.alert('Error', 'Enter the member’s email address.');
      return;
    }
    setInviting(true);
    try {
      await inviteClubMember(clubId, email);
      setInviteEmail('');
      await load();
      Alert.alert('Added', `${email} is now a verified member.`);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not add member. They need an app account first.');
    } finally {
      setInviting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-darkBackground" edges={['top', 'bottom']}>
      <View className="px-6 py-4 flex-row items-center border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color={isDark ? 'white' : 'black'} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-pbold text-textPrimary dark:text-white" numberOfLines={1}>
            {clubName}
          </Text>
          <Text className="text-xs text-textSecondary dark:text-gray-400 font-pregular">Verify members</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View className="mt-10 items-center">
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : (
          <>
            <Text className="text-sm font-pmedium text-textSecondary dark:text-gray-400 mb-3 uppercase tracking-widest">
              Add Member
            </Text>
            <View className="flex-row items-center bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-2 mb-6">
              <Ionicons name="mail-outline" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <TextInput
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="Student email…"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                keyboardType="email-address"
                autoCapitalize="none"
                className="flex-1 ml-2 text-textPrimary dark:text-white font-pregular py-2"
              />
              <TouchableOpacity
                onPress={handleInvite}
                disabled={inviting}
                className="bg-primary dark:bg-indigo-500 px-4 py-2 rounded-full ml-2"
              >
                <Text className="text-white font-pmedium text-xs">{inviting ? '…' : 'Add'}</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-sm font-pmedium text-textSecondary dark:text-gray-400 mb-3 uppercase tracking-widest">
              Requests ({pending.length})
            </Text>
            {pending.length === 0 ? (
              <Text className="text-sm text-gray-400 font-pregular mb-6">No pending requests.</Text>
            ) : (
              pending.map((m) => (
                <View
                  key={m.membershipId}
                  className="bg-white dark:bg-darkCard p-4 rounded-2xl mb-3 border border-amber-500/30"
                >
                  <Text className="text-base font-psemibold text-textPrimary dark:text-white" numberOfLines={1}>
                    {m.studentName ?? m.studentEmail ?? 'Member'}
                  </Text>
                  {!!m.usn && (
                    <Text className="text-xs text-textSecondary dark:text-gray-400 mb-2">{m.usn}</Text>
                  )}
                  <View className="flex-row gap-2 mt-1">
                    <TouchableOpacity
                      onPress={() => act(m.membershipId, 'active', `${m.studentName ?? 'Member'} verified!`)}
                      disabled={actingId === m.membershipId}
                      className="flex-1 py-2 rounded-xl bg-success/15 items-center"
                    >
                      <Text className="text-success font-pbold">Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => act(m.membershipId, 'rejected', 'Request rejected.')}
                      disabled={actingId === m.membershipId}
                      className="flex-1 py-2 rounded-xl bg-red-500/10 items-center"
                    >
                      <Text className="text-red-500 font-pbold">Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            <Text className="text-sm font-pmedium text-textSecondary dark:text-gray-400 mb-3 mt-4 uppercase tracking-widest">
              Members ({active.length})
            </Text>
            {active.map((m) => (
              <View
                key={m.membershipId}
                className="bg-white dark:bg-darkCard p-4 rounded-2xl mb-2 border border-gray-100 dark:border-gray-800 flex-row items-center"
              >
                <View className="flex-1 mr-2">
                  <Text className="text-base font-psemibold text-textPrimary dark:text-white" numberOfLines={1}>
                    {m.studentName ?? m.studentEmail ?? 'Member'}
                  </Text>
                  <Text className="text-xs text-textSecondary dark:text-gray-400">
                    {m.role}{m.usn ? ` • ${m.usn}` : ''}
                  </Text>
                </View>
                {m.role !== 'owner' && (
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert('Remove', `Remove ${m.studentName ?? 'this member'}?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Remove', style: 'destructive', onPress: () => act(m.membershipId, 'removed', 'Member removed.') },
                      ])
                    }
                    disabled={actingId === m.membershipId}
                    className="p-2"
                  >
                    <Ionicons name="person-remove-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ClubMembersScreen;
