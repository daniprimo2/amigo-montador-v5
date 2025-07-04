import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Send, ArrowLeft, DollarSign, User, Play, Loader2, Star, Trash2, AlertTriangle, CheckSquare, CreditCard, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PaymentDialog } from '@/components/payment/payment-dialog';
import { HireAssemblerDialog } from '@/components/payment/hire-assembler-dialog';
import { PixPaymentDialog } from '@/components/payment/pix-payment-dialog';
import { apiRequest } from '@/lib/queryClient';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';

interface ChatInterfaceProps {
  serviceId: number;
  assemblerId?: number; // ID do montador específico para o chat (usado quando o lojista seleciona um chat específico)
  onBack: () => void;
}

interface Message {
  id: number;
  serviceId: number;
  assemblerId?: number; // ID do montador para esta conversa específica
  senderId: number;
  content: string;
  messageType?: string;
  sentAt: string;
  sender?: {
    name: string;
    userType: string;
  };
}

interface Service {
  id: number;
  title: string;
  status: 'open' | 'in-progress' | 'completed' | 'cancelled' | 'awaiting_evaluation';
  price?: string | number;
  [key: string]: any;
}

interface UserProfile {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  userType: string;
  profilePhotoUrl?: string;
  averageRating?: number;
  totalRatings?: number;
  city?: string;
  state?: string;
  specialties?: string[];
  store?: {
    name: string;
    address: string;
    city: string;
    state: string;
    logoUrl?: string;
  };
  assembler?: {
    specialties: string[];
    experience: string;
    description: string;
    availability: string;
    rating?: number;
  };
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ serviceId, assemblerId, onBack }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Validar serviceId antes de continuar
  if (!serviceId || isNaN(Number(serviceId)) || Number(serviceId) <= 0) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold text-red-600">Erro: ID do serviço inválido</h2>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-400" />
            <p>Não foi possível carregar o chat. ID do serviço inválido.</p>
            <Button className="mt-4" onClick={onBack}>Voltar</Button>
          </div>
        </div>
      </div>
    );
  }
  
  const [message, setMessage] = useState('');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isPixPaymentDialogOpen, setIsPixPaymentDialogOpen] = useState(false);
  const [isHireDialogOpen, setIsHireDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [chatPartnerProfile, setChatPartnerProfile] = useState<UserProfile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Query para buscar dados do serviço
  const serviceQuery = useQuery<Service>({
    queryKey: [`/api/services/${serviceId}`],
    queryFn: async () => {
      const response = await fetch(`/api/services/${serviceId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Erro ao buscar dados do serviço');
      }
      return await response.json();
    },
    refetchOnWindowFocus: false,
    enabled: !!serviceId && !isNaN(Number(serviceId)) && Number(serviceId) > 0
  });
  
  // Mutation para atualizar o status do serviço para "em andamento"
  const startServiceMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/services/${serviceId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'in-progress' }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar status do serviço');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Serviço iniciado',
        description: 'O status do serviço foi alterado para "Em Andamento"',
        duration: 3000,
      });
      
      // Invalidar queries para atualizar a UI
      queryClient.invalidateQueries({ queryKey: [`/api/services/${serviceId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/store/services/with-applications'] });
    },
    onError: (error) => {
      // Error logging removed for production
toast({
        title: 'Erro',
        description: error instanceof Error 
          ? error.message 
          : 'Não foi possível iniciar o serviço. Tente novamente.',
        variant: 'destructive',
      });
    }
  });
  
  // Mutation para completar o serviço
  const completeServiceMutation = useMutation({
    mutationFn: async () => {
      setIsCompleting(true);
      
      const response = await apiRequest({
        method: 'POST',
        url: `/api/services/${serviceId}/complete`,
        data: {}
      });
      
      return response;
    },
    onSuccess: () => {
      toast({
        title: 'Serviço finalizado com sucesso!',
        description: 'É necessário avaliar o serviço para continuar. Uma tela de avaliação será aberta automaticamente.',
        duration: 8000,
        variant: 'default',
        className: 'bg-yellow-100 border-yellow-500 border-2 font-medium'
      });
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: [`/api/services/${serviceId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/store/services/with-applications'] });
      
      setIsCompleting(false);
    },
    onError: (error) => {
      // Error logging removed for production
toast({
        title: 'Erro',
        description: error instanceof Error 
          ? error.message 
          : 'Não foi possível finalizar o serviço. Tente novamente.',
        variant: 'destructive',
      });
      
      setIsCompleting(false);
    }
  });
  
  // Função para iniciar o serviço (mudar status para "em andamento")
  const handleStartService = () => {
    startServiceMutation.mutate();
  };
  
  // Função para completar o serviço
  const handleCompleteService = () => {
    completeServiceMutation.mutate();
  };
  
  // Buscar mensagens do chat
  const messagesQuery = useQuery<Message[]>({
    queryKey: [`/api/services/${serviceId}/messages`, assemblerId], // Incluir assemblerId na query key
    queryFn: async () => {
      // Construir URL com ou sem o parâmetro assemblerId
      const url = assemblerId 
        ? `/api/services/${serviceId}/messages?assemblerId=${assemblerId}`
        : `/api/services/${serviceId}/messages`;
      
      console.log('Fetching messages from:', url);
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      
      console.log('Messages response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching messages:', response.status, errorText);
        throw new Error(`Erro ao buscar mensagens: ${response.status}`);
      }
      
      const fetchedMessages = await response.json();
      console.log('Fetched messages:', fetchedMessages.length, 'messages');
      
      // Garantir que as mensagens estejam ordenadas por data de envio
      const sortedMessages = fetchedMessages.sort((a: Message, b: Message) => {
        return new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime();
      });
      
      return sortedMessages;
    },
    refetchInterval: 5000, // Atualiza a cada 5 segundos como backup em caso de falha do WebSocket
    enabled: !!serviceId && !isNaN(Number(serviceId)) && Number(serviceId) > 0,
    retry: 3,
    retryDelay: 1000
  });

  const { data: messages = [], isLoading, error: messagesError } = messagesQuery;
  
  // Recuperar detalhes do serviço (para o título e status)
  const { data: service } = serviceQuery;

  // Function to check if there's a payment proof in the messages
  const hasPaymentProof = messages?.some(msg => msg.messageType === 'payment_proof') || false;

  // Mutation para marcar mensagens como lidas
  const markMessagesAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/services/${serviceId}/messages/mark-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Erro ao marcar mensagens como lidas');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Invalidar a query de contagem de mensagens não lidas
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
    },
    onError: (error) => {
      console.error('Erro ao marcar mensagens como lidas:', error);
    }
  });

  // Marcar mensagens como lidas quando o chat carrega ou quando novas mensagens chegam
  useEffect(() => {
    if (!isLoading && messages && messages.length > 0 && user) {
      // Verificar se há mensagens não lidas (enviadas por outros usuários)
      const hasUnreadMessages = messages.some(msg => msg.senderId !== user.id);
      
      if (hasUnreadMessages) {
        // Disparar evento personalizado para limpar notificações visuais
        const clearNotificationEvent = new CustomEvent('chat-messages-viewed', {
          detail: { serviceId, userId: user.id }
        });
        window.dispatchEvent(clearNotificationEvent);
        
        // Marcar como lidas com delay para evitar race conditions
        const timer = setTimeout(() => {
          markMessagesAsReadMutation.mutate();
        }, 500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, messages, user, serviceId]);

  // Marcar como lidas quando o componente é montado (usuário abriu o chat)
  useEffect(() => {
    if (user && serviceId) {
      // Limpar notificações visuais imediatamente
      const clearNotificationEvent = new CustomEvent('chat-opened', {
        detail: { serviceId, userId: user.id }
      });
      window.dispatchEvent(clearNotificationEvent);
      
      // Marcar como lidas após um delay para garantir que as mensagens foram carregadas
      const timer = setTimeout(() => {
        if (!isLoading) {
          markMessagesAsReadMutation.mutate();
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [serviceId, user]);

  // Buscar perfil do parceiro de conversa baseado nas mensagens
  useEffect(() => {
    const fetchChatPartnerProfile = async () => {
      if (!messages || messages.length === 0 || !user) return;
      
      // Encontrar o ID do outro usuário (não sendo o usuário atual)
      const otherUserId = messages.find(msg => msg.senderId !== user.id)?.senderId;
      
      if (!otherUserId || chatPartnerProfile?.id === otherUserId) return;
      
      try {
        const response = await fetch(`/api/users/${otherUserId}/profile`);
        if (!response.ok) {
          throw new Error('Falha ao buscar perfil do parceiro');
        }
        
        const profileData = await response.json();
        setChatPartnerProfile(profileData);
      } catch (error) {
        console.error('Erro ao buscar perfil do parceiro de conversa:', error);
      }
    };
    
    fetchChatPartnerProfile();
  }, [messages, user, chatPartnerProfile?.id]);
  
  // Mutation para excluir mensagem
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await fetch(`/api/services/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir mensagem');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Mensagem excluída',
        description: 'A mensagem foi excluída com sucesso',
        duration: 3000,
      });
      
      // Invalidar a consulta para atualizar a lista de mensagens
      queryClient.invalidateQueries({ queryKey: [`/api/services/${serviceId}/messages`] });
    },
    onError: (error) => {
      // Error logging removed for production
toast({
        title: 'Erro',
        description: error instanceof Error 
          ? error.message 
          : 'Não foi possível excluir a mensagem. Mensagens de serviços concluídos não podem ser excluídas.',
        variant: 'destructive',
      });
    }
  });

  // Mutation para enviar mensagem
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/services/${serviceId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ content, assemblerId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao enviar mensagem');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      // Limpar campo de mensagem e atualizar a lista
      setMessage('');
      
      // Invalidar a consulta para atualizar a lista de mensagens
      queryClient.invalidateQueries({ queryKey: [`/api/services/${serviceId}/messages`] });
      
      // IMPORTANTE: Invalidar a nova API que busca TODOS os serviços com mensagens
      queryClient.invalidateQueries({ queryKey: ['/api/store/services/with-messages'] });
      
      // Também invalidar as listas de serviços para atualizar contadores e status se necessário
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/store/services/with-applications'] });
      
      // Rolar para o final da conversa depois que a lista for atualizada
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },
    onError: (error) => {
      // Error logging removed for production
toast({
        title: 'Erro',
        description: error instanceof Error 
          ? error.message 
          : 'Não foi possível enviar a mensagem. Tente novamente.',
        variant: 'destructive',
      });
    }
  });

  // Mutation para transferir pagamento para montador
  const transferPixPaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/payment/pix/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ serviceId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao transferir pagamento');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Pagamento Transferido',
        description: 'O pagamento foi transferido para o montador e o serviço foi concluído.',
      });
      
      // Invalidar queries para atualizar mensagens e serviços
      queryClient.invalidateQueries({ queryKey: [`/api/services/${serviceId}/messages`] });
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: [`/api/services/${serviceId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/services/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/store/services/with-applications'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao transferir pagamento',
        variant: 'destructive',
      });
    }
  });

  // Mutation para aprovar/rejeitar pagamento PIX
  const approvePixPaymentMutation = useMutation({
    mutationFn: async ({ approved }: { approved: boolean }) => {
      const response = await fetch('/api/payment/pix/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ serviceId, approved }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao processar aprovação de pagamento');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.approved ? 'Pagamento Confirmado' : 'Pagamento Rejeitado',
        description: data.message,
      });
      
      // Invalidar queries para atualizar mensagens e serviços
      queryClient.invalidateQueries({ queryKey: [`/api/services/${serviceId}/messages`] });
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao processar pagamento',
        variant: 'destructive',
      });
    }
  });
  
  // Rolar para o final da conversa quando novas mensagens chegarem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Marcar mensagens como lidas quando o chat for aberto
  useEffect(() => {
    // Função para marcar mensagens como lidas
    const markMessagesAsRead = async () => {
      try {
        if (serviceId) {
          await fetch(`/api/services/${serviceId}/messages/read`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          // Atualizar as listas para remover indicadores de novas mensagens
          queryClient.invalidateQueries({ queryKey: ['/api/services/active'] });
          queryClient.invalidateQueries({ queryKey: ['/api/store/services/with-applications'] });
          }
      } catch (error) {
        console.error('Erro ao marcar mensagens como lidas:', error);
      }
    };
    
    // Chamar a função quando o componente for montado
    markMessagesAsRead();
  }, [serviceId, queryClient]);
  
  // Notificação sobre a preservação do histórico completo do chat
  useEffect(() => {
    // Mostrar notificação apenas na primeira montagem do componente
    toast({
      title: "Histórico completo preservado",
      description: "Nenhuma mensagem poderá ser excluída do chat, garantindo a preservação completa do histórico de conversas",
      duration: 5000,
    });
  }, [toast]);
  
  // Buscar perfil do usuário selecionado
  const fetchUserProfile = async (userId: number) => {
    if (userId === user?.id) {
      // Se for o próprio usuário, não precisamos buscar do servidor
      setUserProfile({
        id: user.id,
        name: user.name,
        email: user.email || '',
        phone: user.phone || '',
        userType: user.userType
      });
      return;
    }
    
    try {
      setIsLoadingProfile(true);
      const response = await fetch(`/api/users/${userId}/profile`);
      
      if (!response.ok) {
        throw new Error('Falha ao buscar perfil do usuário');
      }
      
      const data = await response.json();
      setUserProfile(data);
    } catch (error) {
      console.error('Erro ao buscar perfil do usuário:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o perfil do usuário. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };
  
  // Abrir diálogo de perfil
  const handleOpenProfile = (userId: number) => {
    setSelectedUserId(userId);
    fetchUserProfile(userId);
    setIsProfileDialogOpen(true);
  };
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      return;
    }
    
    sendMessageMutation.mutate(message);
  };
  
  const formatMessageDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true,
        locale: ptBR
      });
    } catch {
      return 'agora';
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho do chat */}
      <div className="bg-white p-4 rounded-t-lg shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-2 rounded-full" 
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {/* Foto do usuário da conversa */}
          {chatPartnerProfile && (
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
              <img
                src={(chatPartnerProfile as any).profilePhotoUrl || chatPartnerProfile.store?.logoUrl || '/default-avatar.svg'}
                alt={chatPartnerProfile.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/default-avatar.svg';
                }}
              />
            </div>
          )}
          
          <div>
            <h2 className="font-medium">{service?.title || 'Carregando...'}</h2>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {chatPartnerProfile ? (
                  <>
                    {chatPartnerProfile.userType === 'lojista' && chatPartnerProfile.store 
                      ? `${chatPartnerProfile.store.name} - ${chatPartnerProfile.name}`
                      : chatPartnerProfile.name
                    }
                    {chatPartnerProfile.userType === 'montador' && ' (Montador)'}
                    {chatPartnerProfile.userType === 'lojista' && ' (Loja)'}
                  </>
                ) : (
                  user?.userType === 'lojista' ? 'Chat com o montador' : 'Chat com a loja'
                )}
              </p>
            </div>
          </div>
        </div>
        
        {/* Botões de ação - visíveis apenas para lojistas */}
        {user?.userType === 'lojista' && (
          <div className="flex gap-2">
            {/* Botão de Pagamento PIX - sempre disponível durante desenvolvimento para testes */}
            {service && service.price && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50 shadow-sm transition-all duration-200 relative group"
                onClick={() => setIsPixPaymentDialogOpen(true)}
                title="⚠️ Modo de Desenvolvimento: API PIX em desenvolvimento, usar botão de teste"
              >
                <CreditCard className="h-4 w-4" />
                Pagar via PIX
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
              </Button>
            )}
            
            {/* Botão de Contratar Montador / Repassar para Montador */}
            {service && (service.status === 'open' || (service.status === 'in-progress' && hasPaymentProof)) && (
              <Button
                variant="outline"
                size="sm"
                className={`gap-1 ${hasPaymentProof 
                  ? 'text-purple-600 border-purple-600 hover:bg-purple-50' 
                  : 'text-green-600 border-green-600 hover:bg-green-50'
                }`}
                onClick={() => {
                  if (hasPaymentProof) {
                    transferPixPaymentMutation.mutate();
                  } else {
                    setIsHireDialogOpen(true);
                  }
                }}
                disabled={transferPixPaymentMutation.isPending}
              >
                <DollarSign className="h-4 w-4" />
                {transferPixPaymentMutation.isPending 
                  ? 'Processando...' 
                  : hasPaymentProof 
                    ? 'Repassar para Montador' 
                    : 'Contratar Montador'
                }
              </Button>
            )}
          </div>
        )}
      </div>
      
      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
        {messagesError ? (
          // Error state
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar mensagens</h3>
            <p className="text-gray-500 mb-4">
              {messagesError instanceof Error ? messagesError.message : 'Não foi possível carregar as mensagens'}
            </p>
            <Button 
              onClick={() => messagesQuery.refetch()} 
              variant="outline"
              className="text-blue-600 border-blue-600 hover:bg-blue-50"
            >
              Tentar novamente
            </Button>
          </div>
        ) : isLoading ? (
          // Esqueletos para carregamento
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : ''}`}>
                <div className={`max-w-[80%] ${i % 2 === 0 ? 'bg-primary/10' : 'bg-white'} rounded-lg p-3`}>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-3 w-16 mt-1 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : messages && messages.length > 0 ? (
          // Mensagens
          <div className="space-y-3">
            {(() => {
              return messages.map((msg) => {
                const isCurrentUser = msg.senderId === user?.id;
                return (
                <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[80%] rounded-lg p-3 transition-all duration-200 ${
                      isCurrentUser 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md' 
                        : 'bg-gradient-to-r from-gray-50 to-white border border-gray-200 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div 
                        className={`text-xs font-medium ${!isCurrentUser ? 'cursor-pointer hover:underline' : ''}`}
                        onClick={() => !isCurrentUser && handleOpenProfile(msg.senderId)}
                      >
                        {isCurrentUser ? 'Você' : msg.sender?.name || 'Usuário'}
                      </div>
                      
                      {/* Removido botão de excluir para preservar histórico completo do chat */}
                    </div>
                    {/* Renderizar conteúdo baseado no tipo de mensagem */}
                    {msg.messageType === 'payment_proof' ? (
                      <div className={`space-y-3 p-4 rounded-lg border-2 ${
                        isCurrentUser 
                          ? 'bg-green-500 border-green-300 text-white' 
                          : 'bg-green-50 border-green-300 text-green-800'
                      }`}>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5" />
                          <span className="font-bold text-lg">COMPROVANTE PIX</span>
                        </div>
                        <div className="bg-white/20 rounded p-3">
                          <div className="break-words whitespace-pre-wrap text-sm font-mono">
                            {msg.content}
                          </div>
                        </div>
                        <div className={`text-xs font-medium ${isCurrentUser ? 'text-green-100' : 'text-green-700'}`}>
                          ✅ Pagamento confirmado automaticamente pelo sistema
                        </div>
                      </div>
                    ) : (
                      <div className="break-words whitespace-pre-wrap">{msg.content}</div>
                    )}
                    <div className={`text-xs mt-1 text-right ${isCurrentUser ? 'text-white/70' : 'text-gray-500'}`}>
                      {formatMessageDate(msg.sentAt)}
                    </div>
                  </div>
                </div>
              );
              });
            })()}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          // Estado vazio
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-6">
              <p className="text-gray-500">Nenhuma mensagem ainda. Comece a conversa!</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Área de entrada de mensagem */}
      <div className="bg-gradient-to-r from-gray-50 to-white p-3 rounded-b-lg shadow-sm border-t border-gray-200">

        
        {/* Verificar se o serviço está finalizado para desabilitar envio de mensagens */}
        {(service?.status === 'completed' || service?.status === 'awaiting_evaluation') ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-2 text-yellow-700">
              <CheckSquare className="h-5 w-5" />
              <span className="font-medium">Serviço Finalizado</span>
            </div>
            <p className="text-sm text-yellow-600 mt-1">
              Este chat é apenas para visualização. O serviço foi concluído e não é possível enviar novas mensagens.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1"
              disabled={sendMessageMutation.isPending}
            />
            <Button 
              type="submit" 
              disabled={!message.trim() || sendMessageMutation.isPending}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-sm transition-all duration-200"
            >
              {sendMessageMutation.isPending ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>
        )}
      </div>
      
      {/* Modal de pagamento */}
      {isPaymentDialogOpen && (
        <PaymentDialog
          open={isPaymentDialogOpen}
          onClose={() => setIsPaymentDialogOpen(false)}
          serviceId={serviceId}
          amount={service?.price ? `R$ ${(typeof service.price === 'string' ? parseFloat(service.price) : service.price).toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
        />
      )}
      
      {/* Modal de pagamento PIX */}
      {isPixPaymentDialogOpen && (
        <PixPaymentDialog
          isOpen={isPixPaymentDialogOpen}
          onClose={() => setIsPixPaymentDialogOpen(false)}
          serviceId={serviceId}
          amount={String(service?.price || '0')}
          serviceTitle={service?.title || 'Serviço'}
          assemblerInfo={assemblerId && chatPartnerProfile?.userType === 'montador' ? {
            id: assemblerId,
            name: chatPartnerProfile.name,
            userId: chatPartnerProfile.id
          } : undefined}
        />
      )}
      
      {/* Modal de contratação de montador */}
      {isHireDialogOpen && (
        <HireAssemblerDialog
          open={isHireDialogOpen}
          onClose={() => setIsHireDialogOpen(false)}
          serviceId={serviceId}
          assemblerId={assemblerId}
        />
      )}
      
      {/* Modal de perfil do usuário */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Perfil do Usuário</DialogTitle>
            <DialogDescription>
              Informações de contato e detalhes do usuário
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4">
            {isLoadingProfile ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-3/4" />
              </div>
            ) : userProfile ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center mb-4">
                  {/* Use Avatar component for profile photo */}
                  <div className="h-20 w-20 mb-2">
                    {(userProfile as any).profilePhotoUrl && (userProfile as any).profilePhotoUrl !== '/default-avatar.svg' ? (
                      <img 
                        src={(userProfile as any).profilePhotoUrl} 
                        alt={`Foto de ${userProfile.name}`}
                        className="h-full w-full rounded-full object-cover"
                        onError={(e) => {
                          // Fallback if image fails to load
                          e.currentTarget.src = '';
                          e.currentTarget.style.display = 'none';
                          const parentElement = e.currentTarget.parentElement;
                          if (parentElement) {
                            parentElement.innerHTML = `
                            <div class="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                              <svg class="h-12 w-12 text-primary" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                              </svg>
                            </div>
                          `;
                          }
                        }}
                      />
                    ) : userProfile.userType === 'lojista' && userProfile.store?.logoUrl ? (
                      <img 
                        src={userProfile.store.logoUrl} 
                        alt={`Logo de ${userProfile.store.name}`}
                        className="h-full w-full rounded-full object-cover"
                        onError={(e) => {
                          // Fallback if image fails to load
                          e.currentTarget.src = '';
                          e.currentTarget.style.display = 'none';
                          const parentElement = e.currentTarget.parentElement;
                          if (parentElement) {
                            parentElement.innerHTML = `
                            <div class="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                              <svg class="h-12 w-12 text-primary" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                              </svg>
                            </div>
                          `;
                          }
                        }}
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-12 w-12 text-primary" />
                      </div>
                    )}
                  </div>
                  
                  {/* Exibir avaliação logo após a foto de perfil para montadores e lojistas */}
                  {(userProfile as any).averageRating !== undefined && (userProfile as any).averageRating > 0 && (
                    <div className="flex flex-col items-center mt-1">
                      <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1 rounded-full">
                        <div className="flex items-center text-yellow-500">
                          {[1, 2, 3, 4, 5].map((star) => {
                            return (
                              <Star
                                key={star}
                                className={`h-3 w-3 ${
                                  star <= (userProfile as any).averageRating
                                    ? 'text-yellow-500 fill-yellow-500'
                                    : 'text-gray-300'
                                }`}
                              />
                            );
                          })}
                        </div>
                        <span className="font-medium text-yellow-700 text-sm">
                          {(userProfile as any).averageRating.toFixed(1)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 mt-1">
                        {userProfile.userType === 'lojista' 
                          ? 'Avaliação dos montadores' 
                          : 'Avaliação média'}
                        {(userProfile as any).totalRatings && (
                          <span> ({(userProfile as any).totalRatings} {(userProfile as any).totalRatings === 1 ? 'avaliação' : 'avaliações'})</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Nome</h3>
                    <p className="text-base">{userProfile.name}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Tipo de Usuário</h3>
                    <p className="text-base capitalize">{userProfile.userType === 'lojista' ? 'Lojista' : 'Montador'}</p>
                  </div>
                  
                  {/* Informações de localização para ambos os tipos de usuário */}
                  {(userProfile.city || userProfile.state) && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Localização</h3>
                      <p className="text-base">
                        {userProfile.city && userProfile.state 
                          ? `${String(userProfile.city)}, ${String(userProfile.state)}`
                          : String(userProfile.city || userProfile.state || '')}
                      </p>
                    </div>
                  )}
                  
                  {userProfile.userType === 'lojista' && userProfile.store && (
                    <>
                      <div className="pt-2 border-t">
                        <h3 className="text-sm font-medium text-gray-500">Nome da Loja</h3>
                        <p className="text-base">{userProfile.store.name}</p>
                      </div>

                      {userProfile.store.address && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Endereço da Loja</h3>
                          <p className="text-base">{userProfile.store.address}</p>
                        </div>
                      )}

                      {(userProfile.store.city || userProfile.store.state) && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Localidade da Loja</h3>
                          <p className="text-base">
                            {userProfile.store.city && userProfile.store.state 
                              ? `${String(userProfile.store.city)}, ${String(userProfile.store.state)}`
                              : String(userProfile.store.city || userProfile.store.state || '')}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  
                  {userProfile.userType === 'montador' && (
                    <>
                      {/* Especialidades do montador */}
                      {userProfile.specialties && userProfile.specialties.length > 0 && (
                        <div className="pt-2 border-t">
                          <h3 className="text-sm font-medium text-gray-500">Especialidades</h3>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {userProfile.specialties.map((specialty, index) => (
                              <span 
                                key={index}
                                className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                              >
                                {String(specialty)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Informações adicionais do montador se disponíveis */}
                      {userProfile.assembler && (
                        <>
                          {userProfile.assembler.experience && (
                            <div>
                              <h3 className="text-sm font-medium text-gray-500">Experiência</h3>
                              <p className="text-base">{userProfile.assembler.experience}</p>
                            </div>
                          )}

                          {userProfile.assembler.description && (
                            <div>
                              <h3 className="text-sm font-medium text-gray-500">Descrição</h3>
                              <p className="text-base">{userProfile.assembler.description}</p>
                            </div>
                          )}

                          {userProfile.assembler.availability && (
                            <div>
                              <h3 className="text-sm font-medium text-gray-500">Disponibilidade</h3>
                              <p className="text-base">{userProfile.assembler.availability}</p>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {/* Informações de contato */}
                  {userProfile.email && (
                    <div className="pt-2 border-t">
                      <h3 className="text-sm font-medium text-gray-500">Email</h3>
                      <p className="text-base">{userProfile.email}</p>
                    </div>
                  )}

                  {userProfile.phone && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Telefone</h3>
                      <p className="text-base">{userProfile.phone}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500">Não foi possível carregar as informações do usuário.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatInterface;