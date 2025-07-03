import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MandatoryRatingDialog } from "./mandatory-rating-dialog";
import { useAuth } from "@/hooks/use-auth";

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

interface MandatoryRatingCheckerProps {
  currentUserType: 'lojista' | 'montador';
}

export function MandatoryRatingChecker({ currentUserType }: MandatoryRatingCheckerProps) {
  const [currentRatingIndex, setCurrentRatingIndex] = useState(0);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [immediateEvaluation, setImmediateEvaluation] = useState<{
    serviceId: number;
    serviceTitle: string;
    otherUserName: string;
    otherUserType: 'lojista' | 'montador';
  } | null>(null);
  const { user } = useAuth();

  const { data: mandatoryRatings, refetch } = useQuery<MandatoryRatingResponse>({
    queryKey: ['/api/services/pending-evaluations'],
    refetchInterval: 30000, // Check every 30 seconds
    refetchOnWindowFocus: true,
  });

  // Escutar eventos WebSocket para avaliação obrigatória
  useEffect(() => {
    const handleMandatoryEvaluation = (event: CustomEvent) => {
      const { serviceId, serviceData, userId, evaluateUser } = event.detail;
      
      // Verificar se a notificação é para o usuário atual
      if (user && userId === user.id) {
        setImmediateEvaluation({
          serviceId,
          serviceTitle: serviceData?.title || 'Serviço',
          otherUserName: evaluateUser?.name || 'Usuário',
          otherUserType: evaluateUser?.type || (currentUserType === 'lojista' ? 'montador' : 'lojista')
        });
        setShowRatingDialog(true);
      }
    };

    window.addEventListener('mandatory-evaluation-required', handleMandatoryEvaluation as EventListener);
    
    return () => {
      window.removeEventListener('mandatory-evaluation-required', handleMandatoryEvaluation as EventListener);
    };
  }, [user, currentUserType]);

  useEffect(() => {
    if (mandatoryRatings && mandatoryRatings.hasPendingRatings && mandatoryRatings.pendingRatings && mandatoryRatings.pendingRatings.length > 0) {
      // Show the first pending rating dialog only if there's no immediate evaluation
      if (!immediateEvaluation) {
        setCurrentRatingIndex(0);
        setShowRatingDialog(true);
      }
    }
  }, [mandatoryRatings, immediateEvaluation]);

  const handleRatingComplete = () => {
    if (immediateEvaluation) {
      // Se era uma avaliação imediata, limpar e aguardar outras pendentes
      setImmediateEvaluation(null);
      setShowRatingDialog(false);
      // Refetch para verificar se há outras avaliações pendentes
      refetch();
    } else {
      const nextIndex = currentRatingIndex + 1;
      
      if (mandatoryRatings && mandatoryRatings.pendingRatings && nextIndex < mandatoryRatings.pendingRatings.length) {
        // Show next rating dialog
        setCurrentRatingIndex(nextIndex);
      } else {
        // All ratings completed
        setShowRatingDialog(false);
        setCurrentRatingIndex(0);
        // Refetch to get updated status
        refetch();
      }
    }
  };

  // Priorizar avaliação imediata sobre pendentes
  const currentRating = immediateEvaluation || (mandatoryRatings && mandatoryRatings.pendingRatings ? mandatoryRatings.pendingRatings[currentRatingIndex] : null);

  if (!showRatingDialog || !currentRating) {
    return null;
  }

  // Definir valores com base no tipo de avaliação
  const serviceTitle = immediateEvaluation ? 
    immediateEvaluation.serviceTitle : 
    (currentRating as MandatoryRating).serviceName;
  
  const otherUserName = immediateEvaluation ? 
    immediateEvaluation.otherUserName : 
    currentRating.otherUserName;
  
  const otherUserType = immediateEvaluation ? 
    immediateEvaluation.otherUserType : 
    currentRating.otherUserType;

  return (
    <MandatoryRatingDialog
      isOpen={showRatingDialog}
      onClose={handleRatingComplete}
      serviceId={currentRating.serviceId}
      serviceTitle={serviceTitle}
      otherUserName={otherUserName}
      otherUserType={otherUserType}
      currentUserType={currentUserType}
    />
  );
}