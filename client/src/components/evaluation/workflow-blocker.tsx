import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { MandatoryRatingDialog } from '@/components/rating/mandatory-rating-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock } from 'lucide-react';

interface PendingEvaluationService {
  serviceId: number;
  serviceName: string;
  otherUserName: string;
  otherUserType: 'lojista' | 'montador';
}

interface MandatoryRating {
  serviceId: number;
  serviceName: string;
  otherUserName: string;
  otherUserType: 'lojista' | 'montador';
}

interface MandatoryRatingResponse {
  pendingRatings: MandatoryRating[];
  hasPendingRatings: boolean;
}

interface WorkflowBlockerProps {
  userType: 'lojista' | 'montador';
  onBlockingStateChange?: (isBlocked: boolean) => void;
}

/**
 * Componente que bloqueia completamente o fluxo do aplicativo até que
 * todas as avaliações obrigatórias sejam concluídas pelo montador.
 */
export function WorkflowBlocker({ userType, onBlockingStateChange }: WorkflowBlockerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentEvaluationIndex, setCurrentEvaluationIndex] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [immediateEvaluation, setImmediateEvaluation] = useState<PendingEvaluationService | null>(null);

  // Buscar avaliações pendentes com polling mais agressivo para montadores
  const { data: pendingEvaluations, refetch } = useQuery<MandatoryRatingResponse>({
    queryKey: ['/api/services/pending-evaluations'],
    refetchInterval: userType === 'montador' ? 5000 : 15000, // Polling mais frequente para montadores
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0, // Sempre considerar dados como stale para montadores
  });

  // Escutar notificações WebSocket para avaliações obrigatórias
  useEffect(() => {
    const handleMandatoryEvaluation = (event: CustomEvent) => {
      const { serviceId, serviceData, userId, evaluateUser } = event.detail;
      
      // Verificar se a notificação é para o usuário atual
      if (user && userId === user.id) {
        const evaluationData: PendingEvaluationService = {
          serviceId,
          serviceName: serviceData?.title || 'Serviço',
          otherUserName: evaluateUser?.name || 'Usuário',
          otherUserType: evaluateUser?.type || (userType === 'lojista' ? 'montador' : 'lojista')
        };
        
        setImmediateEvaluation(evaluationData);
        setIsBlocked(true);
      }
    };

    window.addEventListener('mandatory-evaluation-required', handleMandatoryEvaluation as EventListener);
    
    return () => {
      window.removeEventListener('mandatory-evaluation-required', handleMandatoryEvaluation as EventListener);
    };
  }, [user, userType]);

  // Monitorar avaliações pendentes e bloquear para montadores
  useEffect(() => {
    const hasPendingEvaluations = pendingEvaluations?.hasPendingRatings && 
                                  pendingEvaluations?.pendingRatings?.length > 0;
    
    // Para montadores, bloquear SEMPRE que houver avaliações pendentes
    if (userType === 'montador' && hasPendingEvaluations) {
      setIsBlocked(true);
    } else if (!immediateEvaluation) {
      setIsBlocked(false);
    }
    
    // Notificar componente pai sobre mudança no estado de bloqueio
    onBlockingStateChange?.(isBlocked);
  }, [pendingEvaluations, userType, immediateEvaluation, isBlocked, onBlockingStateChange]);

  // Prevenir navegação quando há avaliações pendentes para montadores
  useEffect(() => {
    if (userType === 'montador' && isBlocked) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = 'Você tem avaliações pendentes que devem ser concluídas antes de sair.';
        return e.returnValue;
      };

      const handlePopState = (e: PopStateEvent) => {
        e.preventDefault();
        window.history.pushState(null, '', window.location.href);
      };

      // Bloquear tentativas de sair da página
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handlePopState);
      
      // Adicionar estado inicial para prevenir voltar
      window.history.pushState(null, '', window.location.href);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [userType, isBlocked]);

  const handleEvaluationComplete = () => {
    if (immediateEvaluation) {
      // Limpar avaliação imediata
      setImmediateEvaluation(null);
      setIsBlocked(false);
      refetch();
    } else if (pendingEvaluations?.pendingRatings && pendingEvaluations.pendingRatings.length > 0) {
      const nextIndex = currentEvaluationIndex + 1;
      
      if (pendingEvaluations?.pendingRatings && nextIndex < pendingEvaluations.pendingRatings.length) {
        // Ir para próxima avaliação
        setCurrentEvaluationIndex(nextIndex);
      } else {
        // Todas as avaliações concluídas
        setCurrentEvaluationIndex(0);
        setIsBlocked(false);
        refetch();
      }
    }
    
    // Invalidar queries relacionadas
    queryClient.invalidateQueries({ queryKey: ['/api/services'] });
    queryClient.invalidateQueries({ queryKey: ['/api/services/active'] });
  };

  // Determinar qual avaliação mostrar
  const currentEvaluation = immediateEvaluation || 
    (pendingEvaluations?.pendingRatings?.[currentEvaluationIndex]);

  // Para montadores, sempre mostrar bloqueio quando há avaliações pendentes
  if (userType === 'montador' && isBlocked && currentEvaluation) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center">
        <div className="bg-white rounded-xl p-6 m-4 max-w-md w-full shadow-2xl">
          {/* Header de bloqueio */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-red-700 mb-2">
              Ação Obrigatória
            </h2>
            <p className="text-gray-600 text-sm">
              Você deve avaliar o lojista antes de continuar usando o aplicativo.
              Esta é uma etapa obrigatória para manter a integridade do sistema.
            </p>
          </div>

          {/* Contador de avaliações pendentes */}
          {pendingEvaluations?.pendingRatings && pendingEvaluations.pendingRatings.length > 1 && (
            <Alert className="mb-4 bg-yellow-50 border-yellow-200">
              <Clock className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700">
                Avaliação {currentEvaluationIndex + 1} de {pendingEvaluations?.pendingRatings?.length || 0}
              </AlertDescription>
            </Alert>
          )}

          {/* Diálogo de avaliação incorporado */}
          <MandatoryRatingDialog
            isOpen={true}
            onClose={handleEvaluationComplete}
            serviceId={currentEvaluation.serviceId}
            serviceTitle={immediateEvaluation?.serviceName || currentEvaluation.serviceName}
            otherUserName={immediateEvaluation?.otherUserName || currentEvaluation.otherUserName}
            otherUserType={immediateEvaluation?.otherUserType || currentEvaluation.otherUserType}
            currentUserType={userType}
          />
        </div>
      </div>
    );
  }

  // Para lojistas, usar o sistema normal (não bloqueante)
  if (userType === 'lojista' && currentEvaluation) {
    return (
      <MandatoryRatingDialog
        isOpen={true}
        onClose={handleEvaluationComplete}
        serviceId={currentEvaluation.serviceId}
        serviceTitle={immediateEvaluation?.serviceName || currentEvaluation.serviceName}
        otherUserName={immediateEvaluation?.otherUserName || currentEvaluation.otherUserName}
        otherUserType={immediateEvaluation?.otherUserType || currentEvaluation.otherUserType}
        currentUserType={userType}
      />
    );
  }

  return null;
}