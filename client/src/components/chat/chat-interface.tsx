import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Send, ArrowLeft, DollarSign, User, Play, Loader2, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PaymentDialog } from '@/components/payment/payment-dialog';
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
  senderId: number;
  content: string;
  sentAt: string;
  sender?: {
    name: string;
    userType: string;
  };
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  userType: string;
  store?: {
    name: string;
    address: string;
    city: string;
    state: string;
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
  const [message, setMessage] = useState('');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Mutation para atualizar o status do serviço para "em andamento"
  const startServiceMutation = useMutation({
    mutationFn: async () => {
      console.log(`[ChatInterface] Iniciando serviço ${serviceId} como "em andamento"`);
      
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
      console.log(`[ChatInterface] Serviço iniciado com sucesso:`, data);
      
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
      console.error(`[ChatInterface] Erro ao iniciar serviço:`, error);
      
      toast({
        title: 'Erro',
        description: error instanceof Error 
          ? error.message 
          : 'Não foi possível iniciar o serviço. Tente novamente.',
        variant: 'destructive',
      });
    }
  });
  
  // Função para iniciar o serviço (mudar status para "em andamento")
  const handleStartService = () => {
    startServiceMutation.mutate();
  };
  
  // Buscar mensagens do chat
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: [`/api/services/${serviceId}/messages`, assemblerId], // Incluir assemblerId na query key
    queryFn: async () => {
      // Construir URL com ou sem o parâmetro assemblerId
      const url = assemblerId 
        ? `/api/services/${serviceId}/messages?assemblerId=${assemblerId}`
        : `/api/services/${serviceId}/messages`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Erro ao buscar mensagens');
      }
      return response.json();
    },
    refetchInterval: 5000, // Atualiza a cada 5 segundos como backup em caso de falha do WebSocket
  });
  
  // Recuperar detalhes do serviço (para o título)
  const { data: service = { title: 'Serviço' } } = useQuery<any>({
    queryKey: [`/api/services/${serviceId}`],
  });

  // Mutation para enviar mensagem
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      console.log(`[ChatInterface] Enviando mensagem para serviço ${serviceId}`);
      
      const response = await fetch(`/api/services/${serviceId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao enviar mensagem');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      console.log(`[ChatInterface] Mensagem enviada com sucesso:`, data);
      
      // Limpar campo de mensagem e atualizar a lista
      setMessage('');
      
      // Invalidar a consulta para atualizar a lista de mensagens
      queryClient.invalidateQueries({ queryKey: [`/api/services/${serviceId}/messages`] });
      
      // Também invalidar as listas de serviços para atualizar contadores e status se necessário
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      
      // Rolar para o final da conversa depois que a lista for atualizada
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },
    onError: (error) => {
      console.error(`[ChatInterface] Erro ao enviar mensagem:`, error);
      
      toast({
        title: 'Erro',
        description: error instanceof Error 
          ? error.message 
          : 'Não foi possível enviar a mensagem. Tente novamente.',
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
          console.log(`[ChatInterface] Mensagens do serviço ${serviceId} marcadas como lidas`);
        }
      } catch (error) {
        console.error('Erro ao marcar mensagens como lidas:', error);
      }
    };
    
    // Chamar a função quando o componente for montado
    markMessagesAsRead();
  }, [serviceId, queryClient]);
  
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
          <div>
            <h2 className="font-medium">{service?.title || 'Carregando...'}</h2>
            <p className="text-sm text-muted-foreground">
              {user?.userType === 'lojista' ? 'Chat com o montador' : 'Chat com a loja'}
            </p>
          </div>
        </div>
        
        {/* Botões de ação - visíveis apenas para lojistas */}
        {user?.userType === 'lojista' && (
          <div className="flex gap-2">
            {service?.status !== 'in-progress' && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-blue-600 border-blue-600 hover:bg-blue-50"
                onClick={handleStartService}
                disabled={startServiceMutation.isPending}
              >
                {startServiceMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                )}
                Em Andamento
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-green-600 border-green-600 hover:bg-green-50"
              onClick={() => setIsPaymentDialogOpen(true)}
            >
              <DollarSign className="h-4 w-4" />
              Finalizar
            </Button>
          </div>
        )}
      </div>
      
      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
        {isLoading ? (
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
            {messages.map((msg) => {
              const isCurrentUser = msg.senderId === user?.id;
              
              return (
                <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[80%] rounded-lg p-3 ${
                      isCurrentUser ? 'bg-primary text-white' : 'bg-white shadow-sm'
                    }`}
                  >
                    <div 
                      className={`text-xs font-medium mb-1 ${!isCurrentUser ? 'cursor-pointer hover:underline' : ''}`}
                      onClick={() => !isCurrentUser && handleOpenProfile(msg.senderId)}
                    >
                      {isCurrentUser ? 'Você' : msg.sender?.name || 'Usuário'}
                    </div>
                    <div className="break-words whitespace-pre-wrap">{msg.content}</div>
                    <div className={`text-xs mt-1 text-right ${isCurrentUser ? 'text-white/70' : 'text-gray-500'}`}>
                      {formatMessageDate(msg.sentAt)}
                    </div>
                  </div>
                </div>
              );
            })}
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
      <div className="bg-white p-3 rounded-b-lg shadow-sm">
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
            className="bg-primary text-white hover:bg-primary/90"
          >
            {sendMessageMutation.isPending ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
      </div>
      
      {/* Modal de pagamento */}
      {isPaymentDialogOpen && (
        <PaymentDialog
          open={isPaymentDialogOpen}
          onClose={() => setIsPaymentDialogOpen(false)}
          serviceId={serviceId}
          amount={service?.price ? `R$ ${parseFloat(service.price).toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
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
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <User className="h-12 w-12 text-primary" />
                  </div>
                  
                  {/* Exibir avaliação logo após a foto de perfil para montadores */}
                  {userProfile.userType === 'montador' && userProfile.assembler && (
                    <div className="flex items-center bg-yellow-50 px-3 py-1 rounded-full">
                      <span className="font-medium text-yellow-700">{userProfile.assembler.rating || 0}</span>
                      <Star className="h-4 w-4 text-yellow-500 ml-1" />
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
                  
                  {userProfile.userType === 'lojista' && userProfile.store && (
                    <>
                      <div className="pt-2 border-t">
                        <h3 className="text-sm font-medium text-gray-500">Nome da Loja</h3>
                        <p className="text-base">{userProfile.store.name}</p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Localidade</h3>
                        <p className="text-base">
                          {userProfile.store.city} - {userProfile.store.state}
                        </p>
                      </div>
                    </>
                  )}
                  
                  {userProfile.userType === 'montador' && userProfile.assembler && (
                    <>
                      <div className="pt-2 border-t">
                        <h3 className="text-sm font-medium text-gray-500">Especialidades</h3>
                        <p className="text-base">
                          {userProfile.assembler.specialties.join(', ')}
                        </p>
                      </div>
                    </>
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