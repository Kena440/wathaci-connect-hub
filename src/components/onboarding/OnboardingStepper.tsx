import { cn } from '@/lib/utils';
import { Check, Sparkles } from 'lucide-react';

interface Step {
  id: number;
  name: string;
  description?: string;
}

interface OnboardingStepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function OnboardingStepper({ steps, currentStep, onStepClick }: OnboardingStepperProps) {
  return (
    <nav aria-label="Progress" className="mb-10">
      <ol className="flex items-center w-full">
        {steps.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isUpcoming = step.id > currentStep;
          
          return (
            <li key={step.id} className={cn('flex items-center', index !== steps.length - 1 && 'flex-1')}>
              {/* Step indicator */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => onStepClick?.(step.id)}
                  disabled={isUpcoming}
                  className={cn(
                    'relative flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-semibold transition-all duration-300',
                    isCompleted && 'bg-gradient-to-br from-zambia-green to-zambia-green/80 text-white shadow-lg shadow-zambia-green/25 cursor-pointer hover:scale-105',
                    isCurrent && 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground ring-4 ring-primary/20 shadow-xl shadow-primary/20 animate-pulse-glow',
                    isUpcoming && 'bg-muted text-muted-foreground cursor-not-allowed border-2 border-dashed border-muted-foreground/30'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" strokeWidth={3} />
                  ) : isCurrent ? (
                    <Sparkles className="h-5 w-5" />
                  ) : (
                    <span className="text-lg">{step.id}</span>
                  )}
                  
                  {/* Glow effect for current step */}
                  {isCurrent && (
                    <span className="absolute inset-0 rounded-2xl bg-primary/30 blur-md -z-10" />
                  )}
                </button>
                
                {/* Step label */}
                <div className="text-center max-w-[100px]">
                  <span
                    className={cn(
                      'text-xs font-semibold uppercase tracking-wide transition-colors',
                      isCompleted && 'text-zambia-green',
                      isCurrent && 'text-primary',
                      isUpcoming && 'text-muted-foreground'
                    )}
                  >
                    {step.name}
                  </span>
                  {step.description && (
                    <p className={cn(
                      'text-[10px] mt-0.5 hidden sm:block transition-colors',
                      isCurrent ? 'text-foreground/70' : 'text-muted-foreground'
                    )}>
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Connector line */}
              {index !== steps.length - 1 && (
                <div className="flex-1 mx-4 hidden sm:block">
                  <div
                    className={cn(
                      'h-1 rounded-full transition-all duration-500',
                      isCompleted ? 'bg-gradient-to-r from-zambia-green to-zambia-green/60' : 'bg-muted'
                    )}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
