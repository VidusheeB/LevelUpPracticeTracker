import './global.css'

import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { AppProvider, useApp } from './src/contexts/AppContext'

import Login from './src/components/Login'
import Dashboard from './src/components/Dashboard'
import PracticeSession from './src/components/PracticeSession'
import Calendar from './src/components/Calendar'
import EnsembleDashboard from './src/components/EnsembleDashboard'
import Messages from './src/components/Messages'
import TaskList from './src/components/TaskList'
import TeacherDashboard from './src/components/TeacherDashboard'
import Achievements from './src/components/Achievements'
import Toast from './src/components/Toast'

const Tab = createBottomTabNavigator()
const Stack = createStackNavigator()

function MainTabs() {
  const { user } = useApp()
  const isTeacher = user?.role === 'teacher'

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopColor: '#e5e7eb',
          paddingBottom: 4,
          height: 60,
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={Dashboard}
        options={{ tabBarLabel: 'Home', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏠</Text> }}
      />
      <Tab.Screen
        name="Calendar"
        component={Calendar}
        options={{ tabBarLabel: 'Calendar', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📅</Text> }}
      />
      <Tab.Screen
        name="Practice"
        component={PracticeSession}
        options={{
          tabBarLabel: 'Practice',
          tabBarIcon: () => (
            <View style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: '#6366f1',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
              shadowColor: '#6366f1', shadowOpacity: 0.4, shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 8,
            }}>
              <Text style={{ color: 'white', fontSize: 22 }}>▶</Text>
            </View>
          ),
        }}
      />
      {isTeacher ? (
        <Tab.Screen
          name="Students"
          component={TeacherDashboard}
          options={{ tabBarLabel: 'Students', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📚</Text> }}
        />
      ) : (
        <Tab.Screen
          name="Team"
          component={EnsembleDashboard}
          options={{ tabBarLabel: 'Messages', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>💬</Text> }}
        />
      )}
      <Tab.Screen
        name="Tasks"
        component={TaskList}
        options={{ tabBarLabel: 'Tasks', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📋</Text> }}
      />
    </Tab.Navigator>
  )
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen
        name="Achievements"
        component={Achievements}
        options={{ headerShown: true, title: 'Achievements', headerTintColor: '#6366f1' }}
      />
      <Stack.Screen
        name="Messages"
        component={Messages}
        options={{ headerShown: true, title: 'Messages', headerTintColor: '#6366f1' }}
      />
    </Stack.Navigator>
  )
}

function RootNavigator() {
  const { user, loading, toast, clearToast, loadUserData } = useApp()
  const [bootstrapping, setBootstrapping] = useState(true)

  useEffect(() => {
    const restore = async () => {
      try {
        const savedId = await AsyncStorage.getItem('practicebeats_user_id')
        if (savedId) await loadUserData(parseInt(savedId, 10))
      } catch {
        await AsyncStorage.removeItem('practicebeats_user_id')
      } finally {
        setBootstrapping(false)
      }
    }
    restore()
  }, [])

  if (bootstrapping || loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <Text style={{ fontSize: 64, marginBottom: 16 }}>🎵</Text>
        <ActivityIndicator color="#6366f1" />
      </View>
    )
  }

  return (
    <>
      <NavigationContainer>
        {user ? <AppStack /> : <Login />}
      </NavigationContainer>
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
    </>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <RootNavigator />
      </AppProvider>
    </SafeAreaProvider>
  )
}
