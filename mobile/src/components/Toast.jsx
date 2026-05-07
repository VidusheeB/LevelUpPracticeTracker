import { View, Text, TouchableOpacity } from 'react-native'

const variants = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-amber-400',
  info: 'bg-indigo-500',
}

const icons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

export default function Toast({ message, type = 'info', onClose }) {
  return (
    <View className="absolute bottom-24 left-4 right-4 z-50 items-center pointer-events-none">
      <View className={`${variants[type]} px-4 py-3 rounded-xl shadow-lg flex-row items-center gap-3 w-full max-w-md`}>
        <Text className="text-white text-lg font-bold">{icons[type]}</Text>
        <Text className="text-white font-medium flex-1">{message}</Text>
        <TouchableOpacity onPress={onClose}>
          <Text className="text-white opacity-70 text-lg">✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
