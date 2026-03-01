import { View, Text, TextInput, TextInputProps } from 'react-native';
import React from 'react';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
}

const Input = ({ label, error, ...props }: InputProps) => {
  return (
    <View className="mb-4">
      <Text className="text-textSecondary font-pmedium mb-2 text-base">{label}</Text>
      <TextInput
        placeholderTextColor="#94A3B8"
        className={`w-full bg-white dark:bg-darkCard p-4 rounded-xl border ${
          error ? 'border-danger' : 'border-gray-200 dark:border-gray-700'
        } font-pregular text-textPrimary dark:text-white text-base`}
        {...props}
      />
      {error && <Text className="text-danger text-sm mt-1 font-pregular">{error}</Text>}
    </View>
  );
};

export default Input;
