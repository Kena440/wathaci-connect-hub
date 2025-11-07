import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import type { AccountTypeDefinition } from '@/data/accountTypes';

interface AccountTypeSelectionProps {
  options: AccountTypeDefinition[];
  selected?: string;
  onSelect: (value: string) => void;
}

export const AccountTypeSelection = ({ options, selected, onSelect }: AccountTypeSelectionProps) => {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Choose the account type that matches your role so we can tailor the onboarding experience and forms for you.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = option.value === selected;

          return (
            <button
              type="button"
              key={option.value}
              onClick={() => onSelect(option.value)}
              className="w-full text-left focus:outline-none"
              aria-pressed={isSelected}
              aria-label={`Select ${option.label} account type`}
            >
              <Card
                className={
                  `h-full transition-shadow ${
                    isSelected
                      ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
                      : 'hover:border-blue-300 hover:shadow-md'
                  }`
                }
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`rounded-md p-2 ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{option.label}</CardTitle>
                      <CardDescription className="mt-1 text-sm text-gray-600">
                        {option.description}
                      </CardDescription>
                    </div>
                  </div>
                  {isSelected && (
                    <Badge variant="secondary" className="border-blue-200 bg-blue-100 text-blue-700">
                      Selected
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ideal for</p>
                    <ul className="mt-2 space-y-2 text-sm text-gray-600">
                      {option.idealFor.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Onboarding focus
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {option.onboardingFocus.map((focus) => (
                        <Badge
                          key={focus}
                          variant="outline"
                          className={isSelected ? 'border-blue-200 text-blue-700' : ''}
                        >
                          {focus}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
};

