import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Send, ArrowLeft, DollarSign } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PaymentDialog } from '@/components/payment/payment-dialog';

interface ChatInterfaceProps {
  serviceId: number;
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

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ serviceId, onBack }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Buscar mensagens do chat
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: [`/api/services/${serviceId}/messages`],
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
        
        {/* Botão de finalizar negociação */}
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
                    <div className="text-xs font-medium mb-1">
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
    </div>
  );
};

export default ChatInterface;