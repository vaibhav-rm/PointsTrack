import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../lib/api';
import { AppStackParamList, AppNavigationProp } from '../../navigation/types';

type Result = { kind: 'success' | 'already' | 'error'; message: string } | null;

// Accepts a raw UUID or a `ptrack:stu:<uuid>` payload.
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const ScanAttendeeScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { eventId, eventTitle } = useRoute<RouteProp<AppStackParamList, 'ScanAttendee'>>().params;

  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const lockRef = useRef(false);

  const handleScan = async (data: string) => {
    if (lockRef.current || processing) return;
    const match = data.match(UUID);
    if (!match) {
      flash({ kind: 'error', message: 'Not a valid PointsTrack code.' });
      return;
    }
    lockRef.current = true;
    setProcessing(true);
    try {
      const res = await api.post<{ alreadyCheckedIn: boolean; studentName: string }>(
        '/attendees/checkin-by-qr',
        { eventId, studentId: match[0] }
      );
      if (res.alreadyCheckedIn) {
        flash({ kind: 'already', message: `${res.studentName} is already checked in.` });
      } else {
        flash({ kind: 'success', message: `${res.studentName} checked in — points awarded!` });
      }
    } catch (error: any) {
      flash({ kind: 'error', message: error?.message || 'Check-in failed.' });
    } finally {
      setProcessing(false);
    }
  };

  // Show a result banner and re-arm the scanner after a short pause.
  const flash = (r: Result) => {
    setResult(r);
    setTimeout(() => {
      setResult(null);
      lockRef.current = false;
    }, 2200);
  };

  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="white" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-darkBackground items-center justify-center px-8">
        <Ionicons name="camera-outline" size={56} color="#818CF8" />
        <Text className="text-white font-pbold text-xl mt-4 text-center">Camera access needed</Text>
        <Text className="text-gray-400 font-pregular text-center mt-2">
          Allow camera access to scan attendees' QR codes.
        </Text>
        <TouchableOpacity onPress={requestPermission} className="bg-primary dark:bg-indigo-500 px-6 py-3 rounded-xl mt-6">
          <Text className="text-white font-pbold">Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4">
          <Text className="text-gray-400 font-pmedium">Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const bannerColor =
    result?.kind === 'success' ? 'bg-success' : result?.kind === 'already' ? 'bg-orange-500' : 'bg-danger';

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={result || processing ? undefined : ({ data }) => handleScan(data)}
      />

      {/* Overlay */}
      <SafeAreaView className="absolute inset-0" edges={['top', 'bottom']} pointerEvents="box-none">
        {/* Header */}
        <View className="flex-row items-center px-6 py-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="bg-black/40 p-2 rounded-full">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View className="ml-4 flex-1">
            <Text className="text-white font-pbold text-lg" numberOfLines={1}>Scan Attendees</Text>
            <Text className="text-gray-300 font-pregular text-xs" numberOfLines={1}>{eventTitle}</Text>
          </View>
        </View>

        {/* Reticle */}
        <View className="flex-1 items-center justify-center" pointerEvents="none">
          <View className="w-64 h-64 rounded-3xl border-2 border-white/80" />
          <Text className="text-white/90 font-pmedium mt-6">Point at a student's QR code</Text>
        </View>

        {/* Result banner */}
        {(result || processing) && (
          <View className={`mx-6 mb-8 px-5 py-4 rounded-2xl flex-row items-center ${processing ? 'bg-black/70' : bannerColor}`}>
            {processing ? (
              <ActivityIndicator color="white" />
            ) : (
              <Ionicons
                name={result?.kind === 'success' ? 'checkmark-circle' : result?.kind === 'already' ? 'time' : 'close-circle'}
                size={24}
                color="white"
              />
            )}
            <Text className="text-white font-pbold ml-3 flex-1">
              {processing ? 'Checking in…' : result?.message}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

export default ScanAttendeeScreen;
