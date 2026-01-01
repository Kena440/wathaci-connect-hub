import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

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
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => (
          <li key={step.id} className={cn('relative flex-1', index !== steps.length - 1 && 'pr-8 sm:pr-20')}>
            {/* Connector line */}
            {index !== steps.length - 1 && (
              <div
                className={cn(
                  'absolute top-4 left-0 -right-8 sm:-right-20 h-0.5 w-full',
                  step.id < currentStep ? 'bg-primary' : 'bg-muted'
                )}
                style={{ left: '50%' }}
              />
            )}
            
            {/* Step indicator */}
            <button
              type="button"
              onClick={() => onStepClick?.(step.id)}
              disabled={step.id > currentStep}
              className={cn(
                'relative flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-all',
                step.id < currentStep && 'border-primary bg-primary text-primary-foreground cursor-pointer',
                step.id === currentStep && 'border-primary bg-background text-primary',
                step.id > currentStep && 'border-muted bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {step.id < currentStep ? (
                <Check className="h-4 w-4" />
              ) : (
                <span>{step.id}</span>
              )}
            </button>
            
            {/* Step label */}
            <div className="mt-2">
              <span
                className={cn(
                  'text-xs font-medium',
                  step.id <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.name}
              </span>
              {step.description && (
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {step.description}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
