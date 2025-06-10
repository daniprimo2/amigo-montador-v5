# Guia de Migração para React Native

## Visão Geral da Arquitetura

A migração para React Native com backend Spring Boot oferece uma solução empresarial robusta:

```
React Native App (Frontend)
    ↓ HTTP/WebSocket
Spring Boot API (Backend)
    ↓ JPA/Hibernate
PostgreSQL Database
    ↓ Integrations
External Services (Maps, Payment, etc.)
```

## Configuração do Projeto React Native

### 1. Inicialização com Expo (Recomendado)

```bash
npx create-expo-app AmigoMontadorMobile
cd AmigoMontadorMobile
```

### 2. Dependências Principais

```bash
# Navegação
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs

# Estado Global
npm install @reduxjs/toolkit react-redux

# HTTP Client
npm install axios

# Armazenamento Local
npm install @react-native-async-storage/async-storage

# Localização
npm install expo-location

# Câmera e Arquivos
npm install expo-camera expo-document-picker expo-image-picker

# UI Components
npm install react-native-elements react-native-vector-icons

# Formulários
npm install react-hook-form

# Notificações
npm install expo-notifications

# WebSocket
npm install socket.io-client

# Mapas
npm install react-native-maps
```

### 3. Estrutura do Projeto

```
src/
├── components/         # Componentes reutilizáveis
│   ├── common/        # Botões, inputs, cards
│   ├── forms/         # Formulários específicos
│   └── ui/           # Elementos de interface
├── screens/           # Telas da aplicação
│   ├── auth/         # Login, registro
│   ├── store/        # Dashboard da loja
│   ├── assembler/    # Dashboard do montador
│   └── shared/       # Telas compartilhadas
├── services/          # Comunicação com API
│   ├── api.js        # Cliente HTTP configurado
│   ├── auth.js       # Serviços de autenticação
│   └── services.js   # CRUD de serviços
├── store/            # Estado global (Redux)
│   ├── slices/       # Fatias do estado
│   └── store.js      # Configuração da store
├── utils/            # Utilitários
│   ├── validation.js # Validações
│   ├── formatting.js # Formatação de dados
│   └── constants.js  # Constantes
└── navigation/       # Configuração de navegação
    └── AppNavigator.js
```

## Configuração da API

### 1. Cliente HTTP (services/api.js)

```javascript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://your-backend-url:8080/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token JWT
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para tratamento de erros
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('authToken');
      // Redirecionar para login
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### 2. Serviços de Autenticação (services/auth.js)

```javascript
import apiClient from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authService = {
  async login(credentials) {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      const { token, user } = response.data;
      
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      return { token, user };
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erro no login');
    }
  },

  async register(userData) {
    try {
      const response = await apiClient.post('/auth/register', userData);
      const { token, user } = response.data;
      
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      return { token, user };
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erro no registro');
    }
  },

  async validateToken() {
    try {
      const response = await apiClient.get('/auth/validate');
      return response.data;
    } catch (error) {
      await this.logout();
      throw error;
    }
  },

  async logout() {
    await AsyncStorage.multiRemove(['authToken', 'user']);
  }
};
```

### 3. Serviços de Dados (services/services.js)

```javascript
import apiClient from './api';

export const serviceService = {
  async getServices(params = {}) {
    const response = await apiClient.get('/services', { params });
    return response.data;
  },

  async getAvailableServices(specialties = []) {
    const response = await apiClient.get('/services/available', {
      params: { specialties }
    });
    return response.data;
  },

  async createService(serviceData) {
    const response = await apiClient.post('/services', serviceData);
    return response.data;
  },

  async updateService(id, serviceData) {
    const response = await apiClient.put(`/services/${id}`, serviceData);
    return response.data;
  },

  async getServiceById(id) {
    const response = await apiClient.get(`/services/${id}`);
    return response.data;
  },

  async completeService(id) {
    const response = await apiClient.post(`/services/${id}/complete`);
    return response.data;
  }
};
```

## Estado Global com Redux

### 1. Configuração da Store (store/store.js)

```javascript
import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import servicesSlice from './slices/servicesSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    services: servicesSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### 2. Slice de Autenticação (store/slices/authSlice.js)

```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../services/auth';

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      return await authService.login(credentials);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const validateToken = createAsyncThunk(
  'auth/validate',
  async (_, { rejectWithValue }) => {
    try {
      return await authService.validateToken();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    isLoading: false,
    error: null,
    isAuthenticated: false,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      authService.logout();
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
```

## Componentes Principais

### 1. Tela de Login (screens/auth/LoginScreen.js)

```javascript
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Input, Button, Text } from 'react-native-elements';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../../store/slices/authSlice';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.auth);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    try {
      await dispatch(loginUser({ username, password })).unwrap();
      // Navegação será feita automaticamente pelo AuthNavigator
    } catch (error) {
      Alert.alert('Erro', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text h1 style={styles.title}>Amigo Montador</Text>
      
      <Input
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        leftIcon={{ type: 'feather', name: 'user' }}
      />
      
      <Input
        placeholder="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        leftIcon={{ type: 'feather', name: 'lock' }}
      />
      
      <Button
        title="Entrar"
        onPress={handleLogin}
        loading={isLoading}
        style={styles.button}
      />
      
      <Button
        title="Criar Conta"
        type="outline"
        onPress={() => navigation.navigate('Register')}
        style={styles.button}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    marginVertical: 10,
  },
});

export default LoginScreen;
```

### 2. Dashboard da Loja (screens/store/StoreDashboard.js)

```javascript
import React, { useEffect, useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { Header, FAB } from 'react-native-elements';
import { useSelector } from 'react-redux';
import { serviceService } from '../../services/services';
import ServiceCard from '../../components/ServiceCard';

const StoreDashboard = ({ navigation }) => {
  const [services, setServices] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useSelector((state) => state.auth);

  const loadServices = async () => {
    try {
      const data = await serviceService.getServices();
      setServices(data);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadServices();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <Header
        centerComponent={{ text: 'Meus Serviços', style: { color: '#fff' } }}
        rightComponent={{
          icon: 'person',
          color: '#fff',
          onPress: () => navigation.navigate('Profile'),
        }}
      />
      
      <FlatList
        data={services}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ServiceCard
            service={item}
            onPress={() => navigation.navigate('ServiceDetails', { service: item })}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      
      <FAB
        icon={{ name: 'add', color: 'white' }}
        placement="right"
        onPress={() => navigation.navigate('CreateService')}
      />
    </View>
  );
};

export default StoreDashboard;
```

## Funcionalidades Avançadas

### 1. Geolocalização

```javascript
import * as Location from 'expo-location';

export const locationService = {
  async getCurrentLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permissão de localização negada');
    }

    const location = await Location.getCurrentPositionAsync({});
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  },

  async getAddressFromCoords(latitude, longitude) {
    const addresses = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });
    return addresses[0];
  },
};
```

### 2. Upload de Arquivos

```javascript
import * as DocumentPicker from 'expo-document-picker';

export const fileService = {
  async pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });

    if (result.type === 'success') {
      return {
        uri: result.uri,
        name: result.name,
        type: result.mimeType,
      };
    }
    return null;
  },

  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    });

    const response = await apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },
};
```

### 3. Notificações Push

```javascript
import * as Notifications from 'expo-notifications';

export const notificationService = {
  async registerForPushNotifications() {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permissão de notificação negada');
    }

    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  },

  async sendLocalNotification(title, body) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
      },
      trigger: null,
    });
  },
};
```

## Performance e Otimizações

### 1. Lazy Loading de Telas

```javascript
import { lazy, Suspense } from 'react';
import { ActivityIndicator } from 'react-native';

const StoreDashboard = lazy(() => import('../screens/store/StoreDashboard'));

const LazyStoreDashboard = () => (
  <Suspense fallback={<ActivityIndicator size="large" />}>
    <StoreDashboard />
  </Suspense>
);
```

### 2. Cache de Imagens

```javascript
import { Image } from 'expo-image';

const CachedImage = ({ uri, ...props }) => (
  <Image
    source={{ uri }}
    cachePolicy="memory-disk"
    contentFit="cover"
    {...props}
  />
);
```

### 3. Otimização de Listas

```javascript
const ServiceList = ({ services }) => (
  <FlatList
    data={services}
    renderItem={ServiceItem}
    keyExtractor={keyExtractor}
    removeClippedSubviews={true}
    maxToRenderPerBatch={10}
    windowSize={10}
    initialNumToRender={10}
    getItemLayout={(data, index) => ({
      length: 120,
      offset: 120 * index,
      index,
    })}
  />
);
```

## Testes

### 1. Configuração de Testes

```bash
npm install --save-dev jest @testing-library/react-native
```

### 2. Teste de Componente

```javascript
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';

test('deve fazer login com credenciais válidas', async () => {
  const { getByPlaceholderText, getByText } = render(<LoginScreen />);
  
  fireEvent.changeText(getByPlaceholderText('Username'), 'usuario@teste.com');
  fireEvent.changeText(getByPlaceholderText('Senha'), '123456');
  fireEvent.press(getByText('Entrar'));
  
  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalled();
  });
});
```

## Deploy

### 1. Build para Android

```bash
expo build:android
```

### 2. Build para iOS

```bash
expo build:ios
```

### 3. Deploy nas Lojas

```bash
# Google Play Store
expo upload:android

# Apple App Store
expo upload:ios
```

## Benefícios da Migração

1. **Performance Superior**: Renderização nativa para melhor UX
2. **Acesso a APIs Nativas**: Câmera, GPS, notificações push
3. **Distribuição nas Lojas**: Publicação oficial no Google Play e App Store
4. **Offline First**: Funcionalidades offline com sincronização
5. **Push Notifications**: Engajamento melhorado com notificações
6. **Segurança Aprimorada**: Armazenamento seguro de tokens

A migração para React Native com backend Spring Boot oferece uma base sólida para crescimento e escalabilidade empresarial.