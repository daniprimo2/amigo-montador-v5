import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
  const [comment, setComment] = useState("");
  const [punctualityRating, setPunctualityRating] = useState(5);
  const [qualityRating, setQualityRating] = useState(5);
  const [complianceRating, setComplianceRating] = useState(5);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const submitRatingMutation = useMutation({
    mutationFn: async () => {
      if (rating === 0) {
        throw new Error("Por favor, selecione uma avaliação geral");
      }
      
      const response = await apiRequest({
        method: 'POST',
        url: `/api/services/${serviceId}/rate`,
        data: {
          rating,
          comment,
          punctualityRating,
          qualityRating,
          complianceRating,
          emojiRating: rating >= 4 ? 'satisfied' : rating >= 3 ? 'neutral' : 'dissatisfied'
        }
      });
      
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Avaliação Enviada",
          description: "Sua avaliação foi registrada com sucesso!",
        });
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['/api/services'] });
        queryClient.invalidateQueries({ queryKey: ['/api/services/pending-evaluations'] });
        
        onClose();
      } else {
        toast({
          title: "Erro",
          description: data.message || "Falha ao enviar avaliação",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar avaliação",
        variant: "destructive"
      });
    }
  });

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (value: number) => void; label: string }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="transition-colors"
          >
            <Star
              className={`w-6 h-6 ${
                star <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Avaliação Obrigatória
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              Para finalizar o serviço <strong>"{serviceTitle}"</strong>, 
              você deve avaliar {otherUserType === 'lojista' ? 'a loja' : 'o montador'}: 
              <strong> {otherUserName}</strong>
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-xs text-orange-700 font-medium">
                Esta avaliação é obrigatória e deve ser feita por ambas as partes para concluir o serviço.
              </p>
            </div>
          </div>

          <StarRating
            value={rating}
            onChange={setRating}
            label="Avaliação Geral"
          />

          <StarRating
            value={punctualityRating}
            onChange={setPunctualityRating}
            label="Pontualidade"
          />

          <StarRating
            value={qualityRating}
            onChange={setQualityRating}
            label="Qualidade do Trabalho"
          />

          <StarRating
            value={complianceRating}
            onChange={setComplianceRating}
            label="Cumprimento de Acordos"
          />

          <div className="space-y-2">
            <Label htmlFor="comment">Comentário (opcional)</Label>
            <Textarea
              id="comment"
              placeholder="Deixe um comentário sobre a experiência..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={submitRatingMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => submitRatingMutation.mutate()}
              disabled={rating === 0 || submitRatingMutation.isPending}
              className="flex-1"
            >
              {submitRatingMutation.isPending ? "Enviando..." : "Enviar Avaliação"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}