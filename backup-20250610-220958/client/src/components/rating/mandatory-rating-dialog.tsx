import React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { RatingStars } from './rating-stars';

// Schema de validação para o formulário de avaliação obrigatória
const mandatoryRatingSchema = z.object({
  rating: z.number().min(1, 'Selecione uma classificação de 1 a 5 estrelas').max(5),
  comment: z.string().min(10, 'O comentário deve ter pelo menos 10 caracteres'),
});

type MandatoryRatingFormValues = z.infer<typeof mandatoryRatingSchema>;

interface MandatoryRatingDialogProps {
  open: boolean;
  serviceId: number;
  serviceName: string;
  otherUserName: string;
  userType: 'montador' | 'lojista';
  onSuccess: () => void;
}

export const MandatoryRatingDialog: React.FC<MandatoryRatingDialogProps> = ({
  open,
  serviceId,
  serviceName,
  otherUserName,
  userType,
  onSuccess,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<MandatoryRatingFormValues>({
    resolver: zodResolver(mandatoryRatingSchema),
    defaultValues: {
      rating: 0,
      comment: '',
    },
    mode: 'onChange',
  });

  const isSubmitting = form.formState.isSubmitting;
  const rating = form.watch('rating');

  const onSubmit = async (data: MandatoryRatingFormValues) => {
    try {
      await apiRequest(`/api/services/${serviceId}/rate`, 'POST', {
        rating: data.rating,
        comment: data.comment,
      });

      toast({
        title: 'Avaliação enviada com sucesso!',
        description: `Você avaliou ${otherUserName} pelo serviço "${serviceName}".`,
      });

      // Invalidar consultas relacionadas
      queryClient.invalidateQueries({ queryKey: [`/api/services/${serviceId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/services/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ranking'] });
      
      // Resetar formulário
      form.reset();
      
      // Callback de sucesso
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar avaliação',
        description: error.response?.data?.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    }
  };

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return 'Muito ruim';
      case 2: return 'Ruim';
      case 3: return 'Regular';
      case 4: return 'Bom';
      case 5: return 'Excelente';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {
      // Impedir que o usuário feche o diálogo sem avaliar
      toast({
        title: "Avaliação obrigatória",
        description: "É necessário avaliar o serviço para continuar usando o aplicativo.",
        variant: "destructive"
      });
    }}>
      <DialogContent className="sm:max-w-[500px]" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">
            Avaliação Obrigatória
          </DialogTitle>
          <DialogDescription className="text-center space-y-3">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-semibold text-blue-800">
                Serviço: "{serviceName}"
              </p>
              <p className="text-blue-700">
                Como você avalia {otherUserName}?
              </p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm">
              <span className="font-semibold">⚠️ Atenção:</span> Esta avaliação é obrigatória para continuar usando o aplicativo.
            </div>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem className="flex flex-col items-center space-y-4">
                  <FormLabel className="text-center font-semibold text-lg">
                    Sua classificação <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="flex flex-col items-center space-y-2">
                      <RatingStars
                        rating={field.value}
                        interactive
                        size="lg"
                        onRatingChange={(value) => field.onChange(value)}
                        className="scale-125"
                      />
                      {rating > 0 && (
                        <p className="text-lg font-medium text-gray-700">
                          {getRatingText(rating)}
                        </p>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold">
                    Comentário detalhado <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`Descreva sua experiência com ${otherUserName}. Comente sobre pontualidade, qualidade do trabalho, comunicação, etc. (mínimo 10 caracteres)`}
                      className="resize-none min-h-[100px]"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <div className="text-sm text-gray-500">
                    {field.value.length}/10 caracteres mínimos
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col space-y-2">
              <Button 
                type="submit" 
                disabled={isSubmitting || !form.formState.isValid}
                className="w-full h-12 text-lg font-semibold"
                size="lg"
              >
                {isSubmitting ? 'Enviando avaliação...' : 'Enviar avaliação obrigatória'}
              </Button>
              <p className="text-center text-xs text-gray-500">
                Esta janela não pode ser fechada sem completar a avaliação
              </p>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};