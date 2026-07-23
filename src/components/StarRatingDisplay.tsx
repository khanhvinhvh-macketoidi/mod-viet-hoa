import {
  Star,
} from 'lucide-react';

type StarRatingDisplayProps = {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
};

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
};

export default function StarRatingDisplay({
  value,
  size = 'md',
  showValue = false,
}: StarRatingDisplayProps) {
  const roundedValue =
    Math.round(value * 2) / 2;

  return (
    <div className="inline-flex items-center gap-2">
      <div
        className="flex items-center gap-0.5"
        aria-label={`${value} trên 5 sao`}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled =
            roundedValue >= star;

          return (
            <Star
              key={star}
              className={`
                ${sizeClasses[size]}
                ${
                  filled
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-transparent text-slate-600'
                }
              `}
            />
          );
        })}
      </div>

      {showValue && (
        <span className="font-bold text-slate-200">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}