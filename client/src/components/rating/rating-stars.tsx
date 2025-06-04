import React from 'react';
import { cn } from '@/lib/utils';
import { Star, StarHalf } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  className?: string;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  maxRating = 5,
  size = 'md',
  interactive = false,
  onRatingChange,
  className
}) => {
  const [hoverRating, setHoverRating] = React.useState(0);
  
  // Tamanhos de estrelas para diferentes variantes
  const starSizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };
  
  // Cor das estrelas
  const filledColor = 'text-yellow-400';
  const emptyColor = 'text-gray-300';
  
  // Gerar array de estrelas
  const stars = Array.from({ length: maxRating }, (_, i) => i + 1);
  
  const handleClick = (selectedRating: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(selectedRating);
    }
  };
  
  return (
    <div 
      className={cn(
        'flex items-center gap-0.5', 
        interactive && 'cursor-pointer',
        className
      )}
    >
      {stars.map((star) => {
        const displayRating = hoverRating > 0 ? hoverRating : rating;
        const isFilled = star <= displayRating;
        const isHalfFilled = !isFilled && star - 0.5 <= displayRating;
        
        return (
          <div
            key={star}
            className="relative"
            onClick={() => handleClick(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
          >
            {isHalfFilled ? (
              <StarHalf className={cn(starSizes[size], filledColor)} />
            ) : (
              <Star 
                className={cn(
                  starSizes[size], 
                  isFilled ? filledColor : emptyColor
                )} 
                fill={isFilled ? 'currentColor' : 'none'}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};