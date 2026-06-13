import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { api } from '../../lib/api';
import useUserData from '../../hooks/useUserData';
import { computeWrapped, Wrapped } from '../../lib/wrapped';
import { AppNavigationProp } from '../../navigation/types';

const SemesterWrappedScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { userData } = useUserData();
  const [wrapped, setWrapped] = useState<Wrapped | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<View>(null);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await api.get<any[]>('/points');
        setWrapped(computeWrapped(rows, (userData as any) || {}));
      } catch (e) {
        console.error('Wrapped load error', e);
        setWrapped(computeWrapped([], (userData as any) || {}));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userData]);

  useEffect(() => {
    if (!loading) Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [loading]);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'My Semester Wrapped' });
      } else {
        Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
      }
    } catch (e: any) {
      console.error('Share error', e);
      Alert.alert('Error', 'Could not share the card.');
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#0B1020] items-center justify-center">
        <ActivityIndicator color="#818CF8" size="large" />
      </View>
    );
  }

  const w = wrapped!;

  return (
    <View className="flex-1 bg-[#0B1020]">
      <SafeAreaView edges={['top']} className="z-10">
        <View className="flex-row items-center justify-between px-5 py-3">
          <TouchableOpacity onPress={() => navigation.goBack()} className="bg-white/10 p-2 rounded-full">
            <Ionicons name="close" size={22} color="white" />
          </TouchableOpacity>
          <Text className="text-white font-pbold text-base">Semester Wrapped</Text>
          <View style={{ width: 38 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fade }}>
          {/* Captured card */}
          <View ref={cardRef} collapsable={false} className="bg-[#0B1020] px-5 pt-2 pb-6">
            <LinearGradient
              colors={['#4F46E5', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 28, padding: 24, marginBottom: 16 }}
            >
              <Text className="text-white/80 font-pmedium">{w.semesterLabel}</Text>
              <Text className="text-white font-pbold text-2xl mt-1">{w.name}'s Wrapped</Text>

              {w.isEmpty ? (
                <View className="mt-6">
                  <Text className="text-white font-pbold text-xl">No activities yet this semester</Text>
                  <Text className="text-white/80 font-pregular mt-2">
                    Join an event to start your story. Your wrapped will fill up as you earn points!
                  </Text>
                </View>
              ) : (
                <View className="mt-6">
                  <Text className="text-white/80 font-pmedium">You earned</Text>
                  <View className="flex-row items-end">
                    <Text className="text-white font-pbold" style={{ fontSize: 64, lineHeight: 70 }}>{w.semesterPoints}</Text>
                    <Text className="text-white/80 font-pbold text-2xl mb-3 ml-2">points</Text>
                  </View>
                  <Text className="text-white/80 font-pmedium">across {w.activityCount} {w.activityCount === 1 ? 'activity' : 'activities'}</Text>
                </View>
              )}
            </LinearGradient>

            {!w.isEmpty && (
              <>
                {w.topCategory && (
                  <Stat
                    big
                    emoji={w.topCategory.emoji}
                    label="Your vibe this semester"
                    value={w.topCategory.persona}
                    sub={`Most points in ${w.topCategory.name} (${w.topCategory.points} pts)`}
                  />
                )}

                <View className="flex-row gap-3">
                  {w.topClub && (
                    <Stat
                      label="Top club"
                      value={w.topClub.name}
                      sub={`${w.topClub.count} ${w.topClub.count === 1 ? 'event' : 'events'}`}
                      flex
                    />
                  )}
                  {w.busiestMonth && (
                    <Stat
                      label="Busiest month"
                      value={w.busiestMonth.label}
                      sub={`${w.busiestMonth.count} ${w.busiestMonth.count === 1 ? 'activity' : 'activities'}`}
                      flex
                    />
                  )}
                </View>

                {w.biggest && (
                  <Stat
                    emoji="🏆"
                    label="Biggest win"
                    value={w.biggest.title}
                    sub={`+${w.biggest.points} points${w.biggest.clubName ? ` · ${w.biggest.clubName}` : ''}`}
                  />
                )}

                {/* Category breakdown */}
                {w.categories.length > 0 && (
                  <View className="bg-white/5 rounded-2xl p-4 mt-3 border border-white/10">
                    <Text className="text-white/60 font-pmedium text-xs uppercase mb-3">Points by category</Text>
                    {w.categories.map((c) => {
                      const max = w.categories[0].points || 1;
                      return (
                        <View key={c.name} className="mb-2.5">
                          <View className="flex-row justify-between mb-1">
                            <Text className="text-white font-pmedium text-sm">{c.name}</Text>
                            <Text className="text-white/70 font-pbold text-sm">{c.points}</Text>
                          </View>
                          <View className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <View style={{ width: `${Math.max(8, (c.points / max) * 100)}%` }} className="h-full bg-cyan-400 rounded-full" />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            )}

            {/* Overall progress footer */}
            <View className="bg-white/5 rounded-2xl p-4 mt-3 border border-white/10">
              <View className="flex-row justify-between items-end mb-2">
                <Text className="text-white/60 font-pmedium text-xs uppercase">Degree progress</Text>
                <Text className="text-white font-pbold">{w.allTimePoints} / {w.goal}</Text>
              </View>
              <View className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                <View style={{ width: `${w.goalPct}%` }} className="h-full bg-indigo-400 rounded-full" />
              </View>
              <Text className="text-white/50 font-pregular text-xs mt-3 text-center">PointsTrack · AICTE Activity Points</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Share button */}
      <View className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-3 bg-[#0B1020]">
        <TouchableOpacity
          onPress={handleShare}
          disabled={sharing}
          className="bg-white rounded-2xl py-4 flex-row items-center justify-center"
        >
          {sharing ? (
            <ActivityIndicator color="#0B1020" />
          ) : (
            <>
              <Ionicons name="share-social" size={20} color="#0B1020" />
              <Text className="text-[#0B1020] font-pbold text-lg ml-2">Share my Wrapped</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

function Stat({
  label, value, sub, emoji, big, flex,
}: { label: string; value: string; sub?: string; emoji?: string; big?: boolean; flex?: boolean }) {
  return (
    <View className={`bg-white/5 rounded-2xl p-4 mt-3 border border-white/10 ${flex ? 'flex-1' : ''}`}>
      {emoji && <Text style={{ fontSize: big ? 34 : 24 }}>{emoji}</Text>}
      <Text className="text-white/60 font-pmedium text-xs uppercase mt-1">{label}</Text>
      <Text className={`text-white font-pbold ${big ? 'text-2xl' : 'text-lg'} mt-0.5`} numberOfLines={2}>{value}</Text>
      {sub && <Text className="text-white/60 font-pregular text-xs mt-1">{sub}</Text>}
    </View>
  );
}

export default SemesterWrappedScreen;
