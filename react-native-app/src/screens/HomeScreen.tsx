import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import {StackNavigationProp} from '@react-navigation/stack';

type HomeScreenProps = {
  navigation: StackNavigationProp<any, 'Home'>;
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
}

const HomeScreen: React.FC<HomeScreenProps> = ({navigation}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userType, setUserType] = useState<'loja' | 'montador'>('montador');

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    // Simular carregamento de serviços
    const mockServices: Service[] = [
      {
        id: '1',
        title: 'Montagem de Guarda-roupa 6 Portas',
        location: 'Vila Madalena, SP',
        distance: '2.3 km',
        price: 'R$ 150,00',
        status: 'disponivel',
        store: 'MoveisMax',
        date: '16/06/2025',
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
      },
      {
        id: '3',
        title: 'Montagem de Mesa de Jantar',
        location: 'Jardins, SP',
        distance: '1.8 km',
        price: 'R$ 80,00',
        status: 'em_andamento',
        store: 'Furniture Store',
        date: '15/06/2025',
      },
    ];
    setServices(mockServices);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadServices();
    setRefreshing(false);
  };

  const handleServicePress = (service: Service) => {
    navigation.navigate('Services', {serviceId: service.id});
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disponivel':
        return '#10B981';
      case 'em_andamento':
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
      case 'em_andamento':
        return 'Em Andamento';
      case 'concluido':
        return 'Concluído';
      default:
        return 'Desconhecido';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Olá, Montador!</Text>
          <Text style={styles.subtitle}>
            {services.length} serviços disponíveis
          </Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.servicesButton]}
            onPress={() => navigation.navigate('Services')}>
            <Text style={styles.actionIcon}>🔧</Text>
            <Text style={styles.actionText}>Serviços</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.chatButton]}
            onPress={() => navigation.navigate('Chat')}>
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionText}>Chat</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.profileActionButton]}
            onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionText}>Perfil</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Serviços Próximos</Text>
          
          {services.map(service => (
            <TouchableOpacity
              key={service.id}
              style={styles.serviceCard}
              onPress={() => handleServicePress(service)}>
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceTitle}>{service.title}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    {backgroundColor: getStatusColor(service.status)},
                  ]}>
                  <Text style={styles.statusText}>
                    {getStatusText(service.status)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.serviceDetails}>
                <Text style={styles.serviceLocation}>
                  📍 {service.location} • {service.distance}
                </Text>
                <Text style={styles.serviceStore}>
                  🏪 {service.store}
                </Text>
                <Text style={styles.serviceDate}>
                  📅 {service.date}
                </Text>
              </View>
              
              <View style={styles.serviceFooter}>
                <Text style={styles.servicePrice}>{service.price}</Text>
                <Text style={styles.serviceAction}>
                  {service.status === 'disponivel' ? 'Candidatar-se' : 'Ver detalhes'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            AmigoMontador • Versão React Native 1.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  profileButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  servicesButton: {
    backgroundColor: '#EFF6FF',
  },
  chatButton: {
    backgroundColor: '#F0FDF4',
  },
  profileActionButton: {
    backgroundColor: '#FEF3C7',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  servicesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
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
    marginBottom: 12,
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
  footer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default HomeScreen;