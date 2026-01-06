import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface DirectoryFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  locationFilter: string;
  onLocationChange: (value: string) => void;
  industryFilter?: string;
  onIndustryChange?: (value: string) => void;
  showIndustryFilter?: boolean;
  onClearFilters: () => void;
}

const LOCATIONS = [
  { value: 'all', label: 'All Locations' },
  { value: 'Lusaka', label: 'Lusaka' },
  { value: 'Ndola', label: 'Ndola' },
  { value: 'Kitwe', label: 'Kitwe' },
  { value: 'Livingstone', label: 'Livingstone' },
  { value: 'Kabwe', label: 'Kabwe' },
  { value: 'Chipata', label: 'Chipata' },
];

const INDUSTRIES = [
  { value: 'all', label: 'All Industries' },
  { value: 'Agriculture', label: 'Agriculture' },
  { value: 'Technology', label: 'Technology' },
  { value: 'Manufacturing', label: 'Manufacturing' },
  { value: 'Services', label: 'Services' },
  { value: 'Retail', label: 'Retail' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Education', label: 'Education' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Mining', label: 'Mining' },
  { value: 'Construction', label: 'Construction' },
];

export function DirectoryFilters({
  searchTerm,
  onSearchChange,
  locationFilter,
  onLocationChange,
  industryFilter,
  onIndustryChange,
  showIndustryFilter = false,
  onClearFilters,
}: DirectoryFiltersProps) {
  const hasActiveFilters = searchTerm || locationFilter !== 'all' || (industryFilter && industryFilter !== 'all');

  return (
    <div className="bg-card rounded-lg border p-4 space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, title, or keywords..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={locationFilter} onValueChange={onLocationChange}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            {LOCATIONS.map((loc) => (
              <SelectItem key={loc.value} value={loc.value}>
                {loc.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showIndustryFilter && onIndustryChange && (
          <Select value={industryFilter || 'all'} onValueChange={onIndustryChange}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((ind) => (
                <SelectItem key={ind.value} value={ind.value}>
                  {ind.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button variant="ghost" onClick={onClearFilters} className="shrink-0">
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
