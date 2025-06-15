import React, {useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import {StackNavigationProp} from '@react-navigation/stack';

type ServicesScreenProps = {
  navigation: StackNavigationProp<any, 'Services'>;
};

interface Service {
  id: string;
  title: string;
  location: string;
  distance: string;
  price: string;
  status: string;
  store: string;
  date: string;
  description: string;
}

const ServicesScreen: React.FC<ServicesScreenProps> = ({navigation}) => {
  const [activeTab, setActiveTab] = useState<'available' | 'applied' | 'completed'>('available');
  
  const services: Record<string, Service[]> = {
    available: [
      {
        id: '1',
        title: 'Montagem de Guarda-roupa 6 Portas',
        location: 'Vila Madalena, SP',
        distance: '2.3 km',
        price: 'R$ 150,00',
        status: 'disponivel',
        store: 'MoveisMax',
        date: '16/06/2025',
        description: 'Montagem de guarda-roupa de 6 portas com gavetas',
      },
      {
        id: '2',
        title: 'Instalação de Cozinha Completa',
        location: 'Pinheiros, SP',
        distance: '4.1 km',
        price: 'R$ 300,00',
        status: 'disponivel',
        store: 'Casa & Cia',
        date: '17/06/2025',
        description: 'Instalação completa de móveis de cozinha planejada',
      },
    ],
    applied: [
      {
        id: '3',
        title: 'Montagem de Mesa de Jantar',
        location: 'Jardins, SP',
        distance: '1.8 km',
        price: 'R$ 80,00',
        status: 'candidatura_enviada',
        store: 'Furniture Store',
        date: '15/06/2025',
        description: 'Mesa de jantar para 6 pessoas em madeira maciça',
      },
    ],
    completed: [
      {
        id: '4',
        title: 'Montagem de Estante',
        location: 'Moema, SP',
        distance: '3.2 km',
        price: 'R$ 120,00',
        status: 'concluido',
        store: 'ModernHome',
        date: '10/06/2025',
        description: 'Estante modular para sala de estar',
      },
    ],
  };

  const handleServicePress = (service: Service) => {
    if (activeTab === 'available') {
      Alert.alert(
        'Candidatar-se ao Serviço',
        `Deseja se candidatar para: ${service.title}?`,
        [
          {text: 'Cancelar', style: 'cancel'},
          {
            text: 'Candidatar-se',
            onPress: () => {
              Alert.alert('Sucesso!', 'Candidatura enviada com sucesso!');
            },
          },
        ]
      );
    } else {
      navigation.navigate('Chat', {serviceId: service.id});
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disponivel':
        return '#10B981';
      case 'candidatura_enviada':
        return '#F59E0B';
      case 'concluido':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'disponivel':
        return 'Disponível';
      case 'candidatura_enviada':
        return 'Candidatura Enviada';
      case 'concluido':
        return 'Concluído';
      default:
        return 'Desconhecido';
    }
  };

  const renderService = ({item}: {item: Service}) => (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() => handleServicePress(item)}>
      <View style={styles.serviceHeader}>
        <Text style={styles.serviceTitle}>{item.title}</Text>
        <View
          style={[
            styles.statusBadge,
            {backgroundColor: getStatusColor(item.status)},
          ]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      
      <Text style={styles.serviceDescription}>{item.description}</Text>
      
      <View style={styles.serviceDetails}>
        <Text style={styles.serviceLocation}>
          📍 {item.location} • {item.distance}
        </Text>
        <Text style={styles.serviceStore}>🏪 {item.store}</Text>
        <Text style={styles.serviceDate}>📅 {item.date}</Text>
      </View>
      
      <View style={styles.serviceFooter}>
        <Text style={styles.servicePrice}>{item.price}</Text>
        <Text style={styles.serviceAction}>
          {activeTab === 'available' ? 'Candidatar-se' : 'Ver detalhes'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'available' && styles.activeTab,
          ]}
          onPress={() => setActiveTab('available')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'available' && styles.activeTabText,
            ]}>
            Disponíveis
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'applied' && styles.activeTab,
          ]}
          onPress={() => setActiveTab('applied')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'applied' && styles.activeTabText,
            ]}>
            Candidaturas
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'completed' && styles.activeTab,
          ]}
          onPress={() => setActiveTab('completed')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'completed' && styles.activeTabText,
            ]}>
            Concluídos
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={services[activeTab]}
        renderItem={renderService}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Nenhum serviço encontrado nesta categoria
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2563EB',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#2563EB',
  },
  listContainer: {
    padding: 20,
  },
  serviceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  serviceDetails: {
    marginBottom: 12,
  },
  serviceLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  serviceStore: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  serviceDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  serviceAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default ServicesScreen;