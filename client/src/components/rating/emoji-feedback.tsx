import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EmojiOption {
  emoji: string;
  label: string;
  description: string;
}

interface EmojiFeedbackProps {
  onEmojiSelect: (emoji: string) => void;
  selectedEmoji?: string;
  disabled?: boolean;
}

const emojiOptions: EmojiOption[] = [
  {
    emoji: '😊',
    label: 'Muito satisfeito',
    description: 'Serviço excelente, superou expectativas'
  },
  {
    emoji: '👍',
    label: 'Satisfeito',
    description: 'Bom trabalho, como esperado'
  },
  {
    emoji: '😐',
    label: 'Neutro',
    description: 'Trabalho adequado, nada especial'
  },
  {
    emoji: '👎',
    label: 'Insatisfeito',
    description: 'Abaixo das expectativas'
  },
  {
    emoji: '😞',
    label: 'Muito insatisfeito',
    description: 'Serviço ruim, problemas significativos'
  }
];

export const EmojiFeedback: React.FC<EmojiFeedbackProps> = ({
  onEmojiSelect,
  selectedEmoji,
  disabled = false
}) => {
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-center">
          Feedback Rápido
        </CardTitle>
        <p className="text-sm text-gray-600 text-center">
          Escolha um emoji para expressar sua experiência
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-3">
          {emojiOptions.map((option) => (
            <div
              key={option.emoji}
              className="flex flex-col items-center"
            >
              <Button
                variant={selectedEmoji === option.emoji ? "default" : "outline"}
                size="lg"
                className={`
                  w-16 h-16 text-2xl rounded-full transition-all duration-200
                  ${selectedEmoji === option.emoji 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'hover:bg-gray-100 hover:scale-110'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                onClick={() => !disabled && onEmojiSelect(option.emoji)}
                onMouseEnter={() => setHoveredEmoji(option.emoji)}
                onMouseLeave={() => setHoveredEmoji(null)}
                disabled={disabled}
              >
                {option.emoji}
              </Button>
              <span className="text-xs text-center mt-1 text-gray-600 max-w-[60px]">
                {option.label}
              </span>
              {hoveredEmoji === option.emoji && (
                <div className="absolute z-10 bg-black text-white text-xs rounded px-2 py-1 mt-16 max-w-[150px] text-center">
                  {option.description}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmojiFeedback;