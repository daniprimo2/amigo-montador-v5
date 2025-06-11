import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MandatoryRatingDialog } from "./mandatory-rating-dialog";

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

  const { data: mandatoryRatings, refetch } = useQuery<MandatoryRatingResponse>({
    queryKey: ['/api/mandatory-ratings'],
    refetchInterval: 30000, // Check every 30 seconds
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (mandatoryRatings && mandatoryRatings.hasPendingRatings && mandatoryRatings.pendingRatings && mandatoryRatings.pendingRatings.length > 0) {
      // Show the first pending rating dialog
      setCurrentRatingIndex(0);
      setShowRatingDialog(true);
    }
  }, [mandatoryRatings]);

  const handleRatingComplete = () => {
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
  };

  const currentRating = mandatoryRatings && mandatoryRatings.pendingRatings ? mandatoryRatings.pendingRatings[currentRatingIndex] : null;

  if (!showRatingDialog || !currentRating) {
    return null;
  }

  return (
    <MandatoryRatingDialog
      isOpen={showRatingDialog}
      onClose={handleRatingComplete}
      serviceId={currentRating.serviceId}
      serviceTitle={currentRating.serviceName}
      otherUserName={currentRating.otherUserName}
      otherUserType={currentRating.otherUserType}
      currentUserType={currentUserType}
    />
  );
}