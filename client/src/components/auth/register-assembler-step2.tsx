import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';

const assemblerStep2Schema = z.object({
  specialties: z.array(z.string()).min(1, 'Selecione pelo menos uma especialidade'),
  technicalAssistance: z.boolean(),
  experience: z.string().min(10, 'Descreva sua experiência com pelo menos 10 caracteres'),
  radius: z.number().min(20).max(100),
});

export type AssemblerStep2Data = z.infer<typeof assemblerStep2Schema>;

interface RegisterAssemblerStep2Props {
  onNext: (data: AssemblerStep2Data) => void;
  onBack: () => void;
  defaultValues?: Partial<AssemblerStep2Data>;
}

export const RegisterAssemblerStep2: React.FC<RegisterAssemblerStep2Props> = ({ 
  onNext, 
  onBack, 
  defaultValues = {} 
}) => {
  const [radius, setRadius] = useState(defaultValues.radius || 20);

  const form = useForm<AssemblerStep2Data>({
    resolver: zodResolver(assemblerStep2Schema),
    defaultValues: {
      specialties: [],
      technicalAssistance: false,
      experience: '',
      radius: 20,
      ...defaultValues,
    },
  });

  const onSubmit = (data: AssemblerStep2Data) => {
    onNext(data);
  };

  const handleRadiusChange = (value: number[]) => {
    const newRadius = value[0];
    setRadius(newRadius);
    form.setValue('radius', newRadius, { shouldValidate: true });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="w-full">
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-primary bg-primary bg-opacity-10">
                  Passo 2 de 3
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
              <div style={{width: '66%'}} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"></div>
            </div>
          </div>
        </div>
      </div>
      
      <h2 className="text-xl font-semibold text-gray-800 mb-1">Especialidades</h2>
      <p className="text-sm text-gray-500 mb-6">Informe suas especialidades e experiência profissional.</p>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="specialties"
            render={() => (
              <FormItem className="form-field">
                <FormLabel>Material</FormLabel>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Checkbox
                      id="plano-corte-montador"
                      onCheckedChange={(checked) => {
                        const current = form.getValues().specialties || [];
                        const updated = checked
                          ? [...current, 'plano-corte']
                          : current.filter(type => type !== 'plano-corte');
                        form.setValue('specialties', updated, { shouldValidate: true });
                      }}
                    />
                    <label htmlFor="plano-corte-montador" className="ml-2 block text-sm text-gray-700">
                      Plano de corte
                    </label>
                  </div>
                  <div className="flex items-center">
                    <Checkbox
                      id="marcenaria-montador"
                      onCheckedChange={(checked) => {
                        const current = form.getValues().specialties || [];
                        const updated = checked
                          ? [...current, 'marcenaria']
                          : current.filter(type => type !== 'marcenaria');
                        form.setValue('specialties', updated, { shouldValidate: true });
                      }}
                    />
                    <label htmlFor="marcenaria-montador" className="ml-2 block text-sm text-gray-700">
                      Marcenaria
                    </label>
                  </div>
                  <div className="flex items-center">
                    <Checkbox
                      id="fabrica-montador"
                      onCheckedChange={(checked) => {
                        const current = form.getValues().specialties || [];
                        const updated = checked
                          ? [...current, 'fabrica']
                          : current.filter(type => type !== 'fabrica');
                        form.setValue('specialties', updated, { shouldValidate: true });
                      }}
                    />
                    <label htmlFor="fabrica-montador" className="ml-2 block text-sm text-gray-700">
                      Fábrica
                    </label>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="technicalAssistance"
            render={({ field }) => (
              <FormItem className="form-field">
                <FormLabel>Faz assistência técnica?</FormLabel>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center">
                    <RadioGroup 
                      onValueChange={(value) => field.onChange(value === 'true')}
                      defaultValue={field.value ? 'true' : 'false'}
                      className="flex items-center space-x-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="assistencia-sim" />
                        <label htmlFor="assistencia-sim" className="text-sm text-gray-700">Sim</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="assistencia-nao" />
                        <label htmlFor="assistencia-nao" className="text-sm text-gray-700">Não</label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="experience"
            render={({ field }) => (
              <FormItem className="form-field">
                <FormLabel>Descrição da experiência profissional</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Descreva sua experiência profissional, especialidades, anos de atuação, etc."
                    rows={4}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="radius"
            render={({ field }) => (
              <FormItem className="form-field">
                <FormLabel>Raio de atuação</FormLabel>
                <FormControl>
                  <div>
                    <Slider
                      value={[field.value]}
                      min={20}
                      max={100}
                      step={1}
                      onValueChange={handleRadiusChange}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>20 km</span>
                      <span>60 km</span>
                      <span>100 km</span>
                    </div>
                    <div className="text-center mt-2">
                      <span className="text-sm font-medium">
                        Raio selecionado: <span>{radius}</span> km
                      </span>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              Voltar
            </Button>
            <Button type="submit" className="auth-button flex-1">
              Próximo
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default RegisterAssemblerStep2;
