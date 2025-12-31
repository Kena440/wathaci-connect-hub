import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeroProps {
  title: string;
  description?: string;
  backgroundImage: string;
  children?: ReactNode;
  className?: string;
  overlayOpacity?: string;
}

export const PageHero = ({ 
  title, 
  description, 
  backgroundImage, 
  children,
  className,
  overlayOpacity = 'bg-black/60'
}: PageHeroProps) => {
  return (
    <div 
      className={cn(
        "relative min-h-[300px] md:min-h-[350px] flex items-center justify-center overflow-hidden",
        className
      )}
    >
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      
      {/* Overlay */}
      <div className={cn("absolute inset-0", overlayOpacity)} />
      
      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16 text-center text-white">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">
          {title}
        </h1>
        {description && (
          <p className="text-lg md:text-xl max-w-3xl mx-auto drop-shadow-md opacity-90">
            {description}
          </p>
        )}
        {children && (
          <div className="mt-8">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHero;
