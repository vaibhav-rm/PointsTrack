import { Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';

interface ButtonProps {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string; // Allow overriding styles
}

const Button = ({ title, onPress, isLoading, variant = 'primary', className }: ButtonProps) => {
  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isLoading}
        className={`w-full rounded-2xl overflow-hidden shadow-lg ${className}`}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#4F46E5', '#06B6D4']} // Deep Indigo -> Electric Teal
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="w-full py-4 items-center justify-center"
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white font-psemibold text-lg">{title}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isLoading}
      className={`w-full py-4 items-center justify-center rounded-2xl border border-secondary bg-transparent ${className}`}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator color="#4F46E5" />
      ) : (
        <Text className="text-primary dark:text-white font-psemibold text-lg">{title}</Text>
      )}
    </TouchableOpacity>
  );
};

export default Button;
