import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import {StackNavigationProp} from '@react-navigation/stack';

type ProfileScreenProps = {
  navigation: StackNavigationProp<any, 'Profile'>;
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({navigation}) => {
  const [userProfile] = useState({
    name: 'João Silva',
    email: 'joao.silva@email.com',
    phone: '(11) 99999-9999',
    userType: 'montador',
    rating: 4.8,
    completedServices: 156,
    location: 'São Paulo, SP',
    joinDate: 'Janeiro 2024',
  });

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Tem certeza que deseja sair?',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => navigation.replace('Login'),
        },
      ]
    );
  };

  const menuItems = [
    {
      icon: '👤',
      title: 'Editar Perfil',
      subtitle: 'Alterar dados pessoais',
      onPress: () => Alert.alert('Em desenvolvimento', 'Funcionalidade em breve'),
    },
    {
      icon: '🔧',
      title: 'Meus Serviços',
      subtitle: 'Histórico de trabalhos',
      onPress: () => navigation.navigate('Services'),
    },
    {
      icon: '💬',
      title: 'Mensagens',
      subtitle: 'Chat com clientes',
      onPress: () => navigation.navigate('Chat'),
    },
    {
      icon: '⭐',
      title: 'Avaliações',
      subtitle: 'Ver feedback recebido',
      onPress: () => Alert.alert('Em desenvolvimento', 'Funcionalidade em breve'),
    },
    {
      icon: '💳',
      title: 'Pagamentos',
      subtitle: 'Histórico financeiro',
      onPress: () => Alert.alert('Em desenvolvimento', 'Funcionalidade em breve'),
    },
    {
      icon: '⚙️',
      title: 'Configurações',
      subtitle: 'Preferências do app',
      onPress: () => Alert.alert('Em desenvolvimento', 'Funcionalidade em breve'),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <View style={styles.profileImage}>
            <Text style={styles.profileImageText}>
              {userProfile.name.charAt(0)}
            </Text>
          </View>
          <TouchableOpacity style={styles.editImageButton}>
            <Text style={styles.editImageIcon}>📷</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.userName}>{userProfile.name}</Text>
        <Text style={styles.userType}>
          {userProfile.userType === 'montador' ? '🔧 Montador' : '🏪 Loja'}
        </Text>
        <Text style={styles.userLocation}>📍 {userProfile.location}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userProfile.rating}</Text>
          <Text style={styles.statLabel}>Avaliação</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userProfile.completedServices}</Text>
          <Text style={styles.statLabel}>Serviços</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userProfile.joinDate}</Text>
          <Text style={styles.statLabel}>Membro desde</Text>
        </View>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}>
            <View style={styles.menuIcon}>
              <Text style={styles.menuIconText}>{item.icon}</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Sair da Conta</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>AmigoMontador v1.0</Text>
        <Text style={styles.footerText}>React Native Edition</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: 'white',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editImageIcon: {
    fontSize: 12,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  userType: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  userLocation: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  menuContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIconText: {
    fontSize: 18,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  menuArrow: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  logoutButton: {
    backgroundColor: '#FEF2F2',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default ProfileScreen;