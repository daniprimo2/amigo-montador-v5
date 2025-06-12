import webpush from 'web-push';
import { storage } from './storage.js';

// Configuração do Web Push
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa40HcCWLdHyuJ1nj6O9pD0REhUbHzOzGlKNMJ3pRJfL7cB4KJXt9F7VdpKzLo',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'VJhzxG9qPkxULLLgFjVFJlPTdW5CrJsf9kE2lxd2YPo'
};

webpush.setVapidDetails(
  'mailto:contato@amigomontador.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

class PushNotificationService {
  private subscriptions = new Map<number, PushSubscription[]>();

  // Registrar subscription de um usuário
  registerSubscription(userId: number, subscription: PushSubscription) {
    if (!this.subscriptions.has(userId)) {
      this.subscriptions.set(userId, []);
    }
    
    const userSubscriptions = this.subscriptions.get(userId)!;
    // Evitar duplicatas
    const exists = userSubscriptions.some(sub => sub.endpoint === subscription.endpoint);
    if (!exists) {
      userSubscriptions.push(subscription);
    }
  }

  // Remover subscription
  unregisterSubscription(userId: number, endpoint: string) {
    const userSubscriptions = this.subscriptions.get(userId);
    if (userSubscriptions) {
      const filtered = userSubscriptions.filter(sub => sub.endpoint !== endpoint);
      this.subscriptions.set(userId, filtered);
    }
  }

  // Enviar notificação para um usuário específico
  async sendToUser(userId: number, payload: NotificationPayload): Promise<boolean> {
    const userSubscriptions = this.subscriptions.get(userId);
    if (!userSubscriptions || userSubscriptions.length === 0) {
      return false;
    }

    const notificationData = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/logo-amigomontador.jpg',
      badge: payload.badge || '/logo-amigomontador.jpg',
      data: payload.data || {},
      actions: payload.actions || []
    };

    const promises = userSubscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, JSON.stringify(notificationData));
        return true;
      } catch (error: any) {
        console.error('Erro ao enviar push notification:', error);
        // Remover subscription inválida
        if (error.statusCode === 410) {
          this.unregisterSubscription(userId, subscription.endpoint);
        }
        return false;
      }
    });

    const results = await Promise.all(promises);
    return results.some(result => result);
  }

  // Notificações específicas do negócio
  async notifyNewService(storeId: number, assemblerIds: number[], serviceData: any) {
    const notification: NotificationPayload = {
      title: 'Novo Serviço Disponível!',
      body: `${serviceData.title} - ${serviceData.location}`,
      icon: '/logo-amigomontador.jpg',
      data: {
        serviceId: serviceData.id,
        type: 'new_service',
        url: `/assembler-dashboard`
      },
      actions: [
        {
          action: 'view',
          title: 'Ver Detalhes'
        },
        {
          action: 'apply',
          title: 'Candidatar-se'
        }
      ]
    };

    const promises = assemblerIds.map(id => this.sendToUser(id, notification));
    await Promise.all(promises);
  }

  async notifyNewMessage(userId: number, senderName: string, serviceTitle: string, serviceId: number) {
    const notification: NotificationPayload = {
      title: 'Nova Mensagem',
      body: `${senderName} enviou uma mensagem sobre "${serviceTitle}"`,
      icon: '/logo-amigomontador.jpg',
      data: {
        serviceId,
        type: 'new_message',
        url: `/chat/${serviceId}`
      },
      actions: [
        {
          action: 'reply',
          title: 'Responder'
        }
      ]
    };

    await this.sendToUser(userId, notification);
  }

  async notifyApplicationAccepted(assemblerId: number, serviceTitle: string, serviceId: number) {
    const notification: NotificationPayload = {
      title: 'Candidatura Aceita!',
      body: `Sua candidatura para "${serviceTitle}" foi aceita!`,
      icon: '/logo-amigomontador.jpg',
      data: {
        serviceId,
        type: 'application_accepted',
        url: `/assembler-dashboard`
      },
      actions: [
        {
          action: 'view',
          title: 'Ver Detalhes'
        }
      ]
    };

    await this.sendToUser(assemblerId, notification);
  }

  async notifyPaymentReceived(userId: number, amount: string, serviceName: string) {
    const notification: NotificationPayload = {
      title: 'Pagamento Recebido!',
      body: `Você recebeu R$ ${amount} pelo serviço "${serviceName}"`,
      icon: '/logo-amigomontador.jpg',
      data: {
        type: 'payment_received',
        amount,
        url: `/profile`
      },
      actions: [
        {
          action: 'view',
          title: 'Ver Detalhes'
        }
      ]
    };

    await this.sendToUser(userId, notification);
  }

  async notifyRatingRequest(userId: number, serviceTitle: string, serviceId: number) {
    const notification: NotificationPayload = {
      title: 'Avalie o Serviço',
      body: `Como foi o serviço "${serviceTitle}"? Sua avaliação é importante!`,
      icon: '/logo-amigomontador.jpg',
      data: {
        serviceId,
        type: 'rating_request',
        url: `/rating/${serviceId}`
      },
      actions: [
        {
          action: 'rate',
          title: 'Avaliar Agora'
        }
      ]
    };

    await this.sendToUser(userId, notification);
  }

  // Estatísticas
  getSubscriptionCount(): number {
    let total = 0;
    this.subscriptions.forEach(subs => total += subs.length);
    return total;
  }

  getUserCount(): number {
    return this.subscriptions.size;
  }
}

export const pushNotificationService = new PushNotificationService();
export { vapidKeys };