import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MandatoryRatingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: number;
  serviceTitle: string;
  otherUserName: string;
  otherUserType: 'lojista' | 'montador';
  currentUserType: 'lojista' | 'montador';
}

export function MandatoryRatingDialog({
  isOpen,
  onClose,
  serviceId,
  serviceTitle,
  otherUserName,
  otherUserType,
  currentUserType
}: MandatoryRatingDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const submitRatingMutation = useMutation({
    mutationFn: async (data: { rating: number; comment: string }) => {
      const response = await apiRequest({
        method: 'POST',
        url: `/api/services/${serviceId}/rate`,
        data
      });
      return await response.json();
    },
    onSuccess: (response) => {
      // Check if service was completed after both evaluations
      if (response.serviceCompleted) {
        toast({
          title: "🎉 Serviço finalizado!",
          description: "Ambas as avaliações foram concluídas. O serviço foi finalizado automaticamente.",
          duration: 8000,
          className: 'bg-green-100 border-green-500 border-2 font-medium shadow-lg'
        });
      } else {
        toast({
          title: "✅ Avaliação enviada",
          description: `Obrigado por avaliar ${otherUserType === 'lojista' ? 'a loja' : 'o montador'}! Aguardando avaliação da outra parte.`,
          duration: 6000,
          className: 'bg-blue-100 border-blue-500 border-2'
        });
      }
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/services/pending-evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/store/services/with-applications'] });
      
      // Reset form
      setRating(0);
      setComment("");
      
      // Close dialog
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar avaliação",
        description: error.message || "Ocorreu um erro ao enviar sua avaliação. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = () => {
    if (rating === 0) {
      toast({
        title: "Avaliação obrigatória",
        description: "Por favor, selecione uma nota de 1 a 5 estrelas.",
        variant: "destructive"
      });
      return;
    }

    submitRatingMutation.mutate({
      rating,
      comment: comment.trim()
    });
  };

  const otherUserTypeLabel = otherUserType === 'lojista' ? 'da loja' : 'do montador';
  const currentUserAction = currentUserType === 'lojista' ? 'contratou' : 'realizou';

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-semibold">
            Avaliação Obrigatória
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-gray-600">
            Para finalizar o serviço "{serviceTitle}", você precisa avaliar {otherUserTypeLabel} {otherUserName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Rating Stars */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Como você avalia o {otherUserType === 'lojista' ? 'atendimento da loja' : 'trabalho do montador'}?
            </Label>
            <div className="flex justify-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-gray-600">
                {rating === 1 && "Muito ruim"}
                {rating === 2 && "Ruim"}
                {rating === 3 && "Regular"}
                {rating === 4 && "Bom"}
                {rating === 5 && "Excelente"}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-sm font-medium">
              Comentário (opcional)
            </Label>
            <Textarea
              id="comment"
              placeholder={`Conte como foi sua experiência com ${otherUserTypeLabel} ${otherUserName}...`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-2">
            <Button 
              onClick={handleSubmit}
              disabled={rating === 0 || submitRatingMutation.isPending}
              className="w-full"
            >
              {submitRatingMutation.isPending ? "Enviando..." : "Enviar Avaliação"}
            </Button>
            
            <p className="text-xs text-gray-500 text-center">
              Esta avaliação é obrigatória para finalizar o serviço.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}