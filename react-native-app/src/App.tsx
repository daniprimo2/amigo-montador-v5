import React from 'react';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {StatusBar, StyleSheet} from 'react-native';

import {AuthProvider} from './contexts/AuthContext';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import RegisterScreen from './screens/RegisterScreen';
import ProfileScreen from './screens/ProfileScreen';
import ServicesScreen from './screens/ServicesScreen';
import ChatScreen from './screens/ChatScreen';

const Stack = createStackNavigator();

const App: React.FC = () => {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <SafeAreaView style={styles.container}>
            <StatusBar
              barStyle="light-content"
              backgroundColor="#2563EB"
              translucent={false}
            />
            <Stack.Navigator
              initialRouteName="Login"
              screenOptions={{
                headerStyle: {
                  backgroundColor: '#2563EB',
                },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: {
                  fontWeight: 'bold',
                  fontSize: 18,
                },
              }}>
              <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{
                  title: 'AmigoMontador',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="Register"
                component={RegisterScreen}
                options={{
                  title: 'Criar Conta',
                }}
              />
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{
                  title: 'AmigoMontador',
                  headerLeft: () => null,
                }}
              />
              <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                  title: 'Meu Perfil',
                }}
              />
              <Stack.Screen
                name="Services"
                component={ServicesScreen}
                options={{
                  title: 'Serviços',
                }}
              />
              <Stack.Screen
                name="Chat"
                component={ChatScreen}
                options={{
                  title: 'Chat',
                }}
              />
            </Stack.Navigator>
          </SafeAreaView>
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

export default App;