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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { RatingStars } from './rating-stars';

// Schema de validação para o formulário de avaliação
const ratingSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

type RatingFormValues = z.infer<typeof ratingSchema>;

interface RatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: number;
  toUserId: number;
  toUserName: string;
  serviceName: string;
  onSuccess?: () => void;
}

export const RatingDialog: React.FC<RatingDialogProps> = ({
  open,
  onOpenChange,
  serviceId,
  toUserId,
  toUserName,
  serviceName,
  onSuccess,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<RatingFormValues>({
    resolver: zodResolver(ratingSchema),
    defaultValues: {
      rating: 0,
      comment: '',
    },
    mode: 'onChange',
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (data: RatingFormValues) => {
    try {
      await apiRequest({
        method: 'POST',
        url: `/api/services/${serviceId}/rate`,
        data: {
          rating: data.rating,
          comment: data.comment,
        }
      });

      // Mostrar toast de sucesso
      toast({
        title: 'Avaliação enviada com sucesso!',
        description: `Você avaliou ${toUserName} pelo serviço ${serviceName}.`,
      });

      // Invalidar consultas relacionadas
      queryClient.invalidateQueries({ queryKey: [`/api/services/${serviceId}/ratings`] });
      
      // Fechar o diálogo
      onOpenChange(false);
      
      // Callback de sucesso
      if (onSuccess) {
        onSuccess();
      }
      
      // Resetar formulário
      form.reset();
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar avaliação',
        description: error.response?.data?.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      // Impedir que o usuário feche o diálogo se não tiver avaliado ainda
      if (!value && form.getValues().rating === 0) {
        toast({
          title: "Avaliação obrigatória",
          description: "É necessário avaliar o serviço antes de continuar.",
          variant: "destructive"
        });
        return;
      }
      onOpenChange(value);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Avalie o serviço</DialogTitle>
          <DialogDescription>
            Como você avalia {toUserName} pelo serviço "{serviceName}"?
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm">
              <span className="font-semibold">Atenção:</span> A avaliação é obrigatória para continuar usando o aplicativo.
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
                  <FormLabel className="text-center font-semibold">
                    Sua avaliação <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <RatingStars
                      rating={field.value}
                      interactive
                      size="lg"
                      onRatingChange={(value) => field.onChange(value)}
                    />
                  </FormControl>
                  {form.getValues().rating === 0 && (
                    <p className="text-red-500 text-sm">Selecione de 1 a 5 estrelas</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentário (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Deixe um comentário sobre sua experiência..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="submit" 
                disabled={isSubmitting || form.getValues().rating === 0}
                className="w-full"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar avaliação'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};