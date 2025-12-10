import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Search, Sparkles, X } from 'lucide-react';
import { supabase } from '@/lib/supabase-enhanced';
import { runMarketplaceSearch } from '@/data/marketplace';

interface AISearchProps {
  onSearch: (query: string, filters: any) => void;
  onAIRecommendations: (recommendations: any[]) => void;
}

const AISearch = ({ onSearch, onAIRecommendations }: AISearchProps) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const categories = [
    'Business Services', 'Legal', 'Accounting', 'Marketing', 
    'IT Services', 'Consulting', 'Training', 'Equipment'
  ];

  const handleAISearch = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-professional-matcher', {
        body: {
          query,
          type: 'marketplace_search',
          filters: activeFilters
        }
      });

      if (error) throw error;

      const fallback = runMarketplaceSearch(query, activeFilters);
      const recommendations = data?.recommendations?.length
        ? data.recommendations
        : fallback.recommendations;
      const suggestionList = data?.suggestions?.length
        ? data.suggestions
        : fallback.suggestions;

      if (recommendations?.length) {
        onAIRecommendations(recommendations);
      }

      if (suggestionList?.length) {
        setSuggestions(suggestionList);
      }

      onSearch(query, { categories: activeFilters });
    } catch (error) {
      console.error('AI search error:', error);
      const fallback = runMarketplaceSearch(query, activeFilters);
      if (fallback.recommendations.length) {
        onAIRecommendations(fallback.recommendations);
      }
      setSuggestions(fallback.suggestions);
      onSearch(query, { categories: activeFilters });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterToggle = (filter: string) => {
    setActiveFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const clearFilters = () => {
    setActiveFilters([]);
    setSuggestions([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search products, services, or describe what you need..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
            onKeyPress={(e) => e.key === 'Enter' && handleAISearch()}
          />
        </div>
        <Button onClick={handleAISearch} disabled={isLoading}>
          <Sparkles className="w-4 h-4 mr-2" />
          {isLoading ? 'Searching...' : 'AI Search'}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <Badge
            key={category}
            variant={activeFilters.includes(category) ? "default" : "outline"}
            className="cursor-pointer hover:bg-blue-100"
            onClick={() => handleFilterToggle(category)}
          >
            {category}
          </Badge>
        ))}
        {activeFilters.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {suggestions.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            AI Suggestions
          </h4>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="cursor-pointer hover:bg-blue-100"
                onClick={() => setQuery(suggestion)}
              >
                {suggestion}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export { AISearch };
export default AISearch;