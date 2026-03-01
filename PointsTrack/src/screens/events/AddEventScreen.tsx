import { View, Text, ScrollView, Alert, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { auth, storage, db } from '../../firebase/config';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { AppNavigationProp } from '../../navigation/types';

import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

const AddEventScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { colorScheme } = useColorScheme();
  const [loading, setLoading] = useState(false);
  
  const [title, setTitle] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = uri.substring(uri.lastIndexOf('/') + 1);
      const storageRef = ref(storage, `certificates/${auth.currentUser?.uid}/${filename}`);
      
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!title || !type || !points || !date) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      let certificateUrl = '';
      if (image) {
        certificateUrl = await uploadImage(image);
      }

      await addDoc(collection(db, 'events'), {
        userId: auth.currentUser?.uid,
        title,
        type,
        description,
        points: Number(points),
        date,
        certificateUrl,
        createdAt: new Date().toISOString(),
        semester: 1, // Defaulting for now, should be from user input or profile
      });

      Alert.alert('Success', 'Event added successfully!');
      navigation.navigate('Dashboard');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-darkBackground" edges={['top', 'bottom']}>
      <View className="px-6 py-4 flex-row items-center border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color={colorScheme === 'dark' ? 'white' : 'black'} />
        </TouchableOpacity>
        <Text className="text-xl font-pbold text-textPrimary dark:text-white">Add New Event</Text>
      </View>
      
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 py-4">
        <Input label="Event Title" value={title} onChangeText={setTitle} placeholder="e.g. Hackathon 2024" />
        <Input label="Event Type" value={type} onChangeText={setType} placeholder="e.g. Technical, Sports" />
        <Input label="Description" value={description} onChangeText={setDescription} placeholder="Brief description..." multiline numberOfLines={3} style={{ height: 100, textAlignVertical: 'top' }} />
        
        <View className="flex-row justify-between gap-4">
          <View className="flex-1">
            <Input label="Points" value={points} onChangeText={setPoints} placeholder="10" keyboardType="numeric" />
          </View>
          <View className="flex-1">
            <Text className="text-textSecondary font-pmedium mb-2 text-base dark:text-gray-400">Date</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} className="w-full bg-white dark:bg-darkCard p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <Text className="text-textPrimary dark:text-white font-pregular text-base">{date}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={new Date(date)}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setDate(selectedDate.toISOString().split('T')[0]);
                  }
                }}
              />
            )}
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-textSecondary font-pmedium mb-2 text-base dark:text-gray-400">Certificate (Optional)</Text>
          <View className="w-full h-40 bg-white dark:bg-darkCard rounded-xl border border-dashed border-gray-300 dark:border-gray-700 items-center justify-center overflow-hidden">
            {image ? (
              <View className="w-full h-full relative">
                <Image source={{ uri: image }} className="w-full h-full" resizeMode="cover" />
                <TouchableOpacity 
                  onPress={() => setImage(null)}
                  className="absolute top-2 right-2 bg-black/50 rounded-full p-1 w-8 h-8 items-center justify-center"
                >
                  <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={pickImage} className="w-full h-full items-center justify-center">
                <Ionicons name="add" size={40} color="#9CA3AF" />
                <Text className="text-gray-400 font-pregular mt-2">Tap to upload</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Button title="Save Event" onPress={handleSubmit} isLoading={loading} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default AddEventScreen;
