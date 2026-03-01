import { View, Text, Platform, Alert, Switch, Modal, TouchableOpacity, FlatList } from "react-native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React, { useState, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { AuthNavigationProp } from "../../navigation/types";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { COLLEGES, College } from "../../data/colleges";
import { Ionicons } from '@expo/vector-icons'; 
import { useColorScheme } from 'nativewind';

const RegisterScreen = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const [loading, setLoading] = useState(false);
  const { colorScheme } = useColorScheme(); // assuming useColorScheme is available or we use nativewind
  
  // State for form fields
  // ... (keep state)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  
  // College Selection State
  const [region, setRegion] = useState<'Bangalore' | 'Mysuru' | 'Belagavi' | 'Kalaburgi' | ''>('');
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [collegeSearch, setCollegeSearch] = useState("");
  const [showCollegeModal, setShowCollegeModal] = useState(false);

  const [usn, setUsn] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [isLateralEntry, setIsLateralEntry] = useState(false);

  const filteredColleges = useMemo(() => {
    if (!region) return [];
    return COLLEGES.filter(c => 
      c.region === region && 
      c.name.toLowerCase().includes(collegeSearch.toLowerCase())
    );
  }, [region, collegeSearch]);

  const handleRegister = async () => {
      // ... (keep validation logic)
    if (!name || !email || !password || !phone || !selectedCollege || !usn || !year || !semester) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    // USN Validation
    const usnPrefix = selectedCollege.code.toUpperCase();
    if (!usn.toUpperCase().startsWith(usnPrefix)) {
      Alert.alert("Invalid USN", `For ${selectedCollege.name}, the USN must start with '${usnPrefix}'`);
      return;
    }
    
    setLoading(true);
    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Create user profile in Firestore
      const requiredPoints = isLateralEntry ? 80 : 100;
      
      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        phone,
        college: selectedCollege.name,
        collegeCode: selectedCollege.code,
        region: selectedCollege.region,
        usn: usn.toUpperCase(),
        year: parseInt(year) || 1,
        semester: parseInt(semester) || 1,
        lateralEntry: isLateralEntry,
        requiredPoints,
        createdAt: new Date().toISOString(),
      });

      Alert.alert("Success", "Account created successfully!");
    } catch (error: any) {
      Alert.alert("Registration Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-darkBackground h-full">
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="px-6 py-4 flex-1"
        enableOnAndroid={true}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={20}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center mb-6">
            <Text className="text-2xl font-pbold text-primary dark:text-white text-center">
              Create Account
            </Text>
            <Text className="text-textSecondary dark:text-gray-400 font-pregular text-center mt-1">
              Start your journey to {isLateralEntry ? "80" : "100"} points
            </Text>
          </View>

          <Input label="Full Name" value={name} onChangeText={setName} placeholder="John Doe" />
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="john@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Input label="Password" value={password} onChangeText={setPassword} placeholder="Min 6 characters" secureTextEntry />
          <Input label="Phone Number" value={phone} onChangeText={setPhone} placeholder="1234567890" keyboardType="phone-pad" />
          
          {/* Region Selection */}
          <View className="mb-4">
            <Text className="text-textSecondary dark:text-gray-400 font-pmedium mb-2 text-base">Region</Text>
            <View className="flex-row flex-wrap gap-2">
              {['Bangalore', 'Mysuru', 'Belagavi', 'Kalaburgi'].map((r) => (
                <TouchableOpacity 
                  key={r}
                  onPress={() => {
                    setRegion(r as any);
                    setSelectedCollege(null); 
                    setCollegeSearch("");
                  }}
                  className={`px-4 py-2 rounded-xl border ${region === r ? 'bg-primary border-primary' : 'bg-white dark:bg-darkCard border-gray-200 dark:border-gray-700'}`}
                >
                  <Text className={`${region === r ? 'text-white' : 'text-textPrimary dark:text-white'} font-pmedium`}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* College Selection */}
          <View className="mb-4">
             <Text className="text-textSecondary dark:text-gray-400 font-pmedium mb-2 text-base">College</Text>
             <TouchableOpacity 
              onPress={() => {
                if (!region) {
                  Alert.alert("Select Region", "Please select a region first.");
                  return;
                }
                setShowCollegeModal(true);
              }}
              className="w-full bg-white dark:bg-darkCard p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex-row justify-between items-center"
             >
                <Text className={`text-base font-pregular ${selectedCollege ? 'text-textPrimary dark:text-white' : 'text-gray-400'}`}>
                  {selectedCollege ? selectedCollege.name : "Select your college"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
             </TouchableOpacity>
          </View>

          <View className="flex-row justify-between gap-2">
             <View className="flex-1">
               <Input 
                label="USN" 
                value={usn} 
                onChangeText={setUsn} 
                placeholder={selectedCollege ? `${selectedCollege.code}23CS001` : "1RV23CS001"}
                autoCapitalize="characters"
               />
             </View>
             <View className="flex-1"><Input label="Year" value={year} onChangeText={setYear} placeholder="1" keyboardType="numeric" /></View>
          </View>
          
          <Input label="Current Semester" value={semester} onChangeText={setSemester} placeholder="1" keyboardType="numeric" />

          <View className="flex-row items-center justify-between mb-6 bg-white dark:bg-darkCard p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <View>
              <Text className="text-base font-pmedium text-textPrimary dark:text-white">Lateral Entry?</Text>
              <Text className="text-xs text-textSecondary dark:text-gray-400 font-pregular">
                {isLateralEntry ? "Required: 80 Points" : "Required: 100 Points"}
              </Text>
            </View>
            <Switch
              trackColor={{ false: "#767577", true: "#06B6D4" }}
              thumbColor={isLateralEntry ? "#ffffff" : "#f4f3f4"}
              onValueChange={setIsLateralEntry}
              value={isLateralEntry}
            />
          </View>

          <View className="mb-6">
            <Button title="Register" onPress={handleRegister} isLoading={loading} />
          </View>

          <View className="flex-row justify-center mb-8">
            <Text className="text-textSecondary dark:text-gray-400 font-pregular">
              Already have an account?{" "}
            </Text>
            <Text
              className="text-secondary font-psemibold"
              onPress={() => navigation.navigate("Login")}
            >
              Log In
            </Text>
          </View>
      </KeyboardAwareScrollView>

      {/* College Selection Modal */}
      <Modal visible={showCollegeModal} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-darkBackground rounded-t-3xl h-[80%] p-6 border-t border-gray-200 dark:border-gray-800">
             <View className="flex-row justify-between items-center mb-6">
               <Text className="text-xl font-pbold text-textPrimary dark:text-white">Select College</Text>
               <TouchableOpacity onPress={() => setShowCollegeModal(false)}>
                 <Ionicons name="close" size={24} color={colorScheme === 'dark' ? 'white' : 'black'} />
               </TouchableOpacity>
             </View>
             
             <Input 
               label="" 
               placeholder="Search college..." 
               value={collegeSearch} 
               onChangeText={setCollegeSearch} 
             />

             <FlatList
               data={filteredColleges}
               keyExtractor={(item) => item.code}
               renderItem={({ item }) => (
                 <TouchableOpacity 
                  className="py-4 border-b border-gray-100 dark:border-gray-800"
                  onPress={() => {
                    setSelectedCollege(item);
                    setShowCollegeModal(false);
                    // Smartly update USN prefix when changing colleges
                    if (!usn) {
                      setUsn(item.code);
                    } else if (selectedCollege) {
                      // Replace old college code with new college code if they already typed something
                      if (usn.toUpperCase().startsWith(selectedCollege.code.toUpperCase())) {
                        setUsn(usn.replace(new RegExp(`^${selectedCollege.code}`, 'i'), item.code));
                      } else {
                        setUsn(item.code);
                      }
                    } else {
                      setUsn(item.code);
                    }
                  }}
                 >
                   <Text className="text-base font-pmedium text-textPrimary dark:text-white">{item.name}</Text>
                   <Text className="text-sm text-textSecondary dark:text-gray-400 font-pregular">{item.code} • {item.region}</Text>
                 </TouchableOpacity>
               )}
               ListEmptyComponent={() => (
                 <Text className="text-center text-textSecondary dark:text-gray-400 mt-10">No colleges found</Text>
               )}
             />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default RegisterScreen;
