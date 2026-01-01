import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Sparkles, X, Mic, Loader2, TrendingUp, History, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface EnhancedAISearchProps {
  onSearch: (query: string, filters: any) => void;
  onAIRecommendations: (recommendations: any[]) => void;
}

const EnhancedAISearch = ({ onSearch, onAIRecommendations }: EnhancedAISearchProps) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingSearches] = useState([
    'Business registration', 'Tax consultant', 'Legal services', 'Marketing agency'
  ]);
  const [isListening, setIsListening] = useState(false);

  const categories = [
    { name: 'Business Services', icon: '💼', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    { name: 'Legal', icon: '⚖️', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
    { name: 'Accounting', icon: '📊', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
    { name: 'Marketing', icon: '📣', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    { name: 'IT Services', icon: '💻', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
    { name: 'Consulting', icon: '🎯', color: 'bg-pink-500/10 text-pink-600 border-pink-500/20' },
    { name: 'Training', icon: '📚', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    { name: 'Equipment', icon: '🔧', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' }
  ];

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('marketplace_recent_searches');
    if (stored) {
      setRecentSearches(JSON.parse(stored).slice(0, 5));
    }
  }, []);

  const saveSearch = useCallback((searchQuery: string) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('marketplace_recent_searches', JSON.stringify(updated));
  }, [recentSearches]);

  const handleAISearch = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    saveSearch(query);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-professional-matcher', {
        body: { 
          query,
          type: 'marketplace_search',
          filters: activeFilters,
          userId: user?.id
        }
      });

      if (error) throw error;

      if (data?.recommendations) {
        onAIRecommendations(data.recommendations);
      }
      
      if (data?.suggestions) {
        setSuggestions(data.suggestions);
      }

      if (data?.insight) {
        setAiInsights(data.insight);
      }

      onSearch(query, { categories: activeFilters });
    } catch (error) {
      console.error('AI search error:', error);
      // Fallback suggestions
      setSuggestions([
        `${query} in Lusaka`,
        `Best ${query} providers`,
        `Affordable ${query}`
      ]);
      setAiInsights(`We found several options matching "${query}". Filter by category for better results.`);
      onSearch(query, { categories: activeFilters });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice search is not supported in your browser');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setTimeout(() => handleAISearch(), 500);
    };

    recognition.start();
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
    setAiInsights(null);
  };

  const handleQuickSearch = (searchTerm: string) => {
    setQuery(searchTerm);
    setTimeout(() => handleAISearch(), 100);
  };

  return (
    <div className="space-y-6">
      {/* Main Search Bar */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-2xl blur-xl opacity-50" />
        <Card className="relative border-2 border-primary/20 bg-card/80 backdrop-blur-sm shadow-xl">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Describe what you're looking for... e.g., 'I need help registering my business'"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-12 pr-12 py-6 text-lg border-0 bg-background/50 focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                  onKeyPress={(e) => e.key === 'Enter' && handleAISearch()}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className={`absolute right-2 top-1/2 -translate-y-1/2 ${isListening ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`}
                  onClick={handleVoiceSearch}
                >
                  <Mic className="w-5 h-5" />
                </Button>
              </div>
              <Button 
                onClick={handleAISearch} 
                disabled={isLoading}
                size="lg"
                className="px-8 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    AI Search
                  </>
                )}
              </Button>
            </div>

            {/* Quick Filters */}
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map(category => (
                <Badge
                  key={category.name}
                  variant="outline"
                  className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                    activeFilters.includes(category.name) 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : category.color
                  }`}
                  onClick={() => handleFilterToggle(category.name)}
                >
                  <span className="mr-1">{category.icon}</span>
                  {category.name}
                </Badge>
              ))}
              {activeFilters.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Helpers */}
      {!query && !aiInsights && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <Card className="bg-card/50 backdrop-blur-sm border-muted">
              <CardContent className="p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <History className="w-4 h-4" />
                  Recent Searches
                </h4>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="cursor-pointer hover:bg-secondary/80 transition-colors"
                      onClick={() => handleQuickSearch(search)}
                    >
                      {search}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trending Searches */}
          <Card className="bg-card/50 backdrop-blur-sm border-muted">
            <CardContent className="p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                Trending Now
              </h4>
              <div className="flex flex-wrap gap-2">
                {trendingSearches.map((search, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => handleQuickSearch(search)}
                  >
                    🔥 {search}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Insights Card */}
      {aiInsights && (
        <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Lightbulb className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1 text-primary">AI Insight</h4>
                <p className="text-sm text-muted-foreground">{aiInsights}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Related Searches
            </h4>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                  onClick={() => handleQuickSearch(suggestion)}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export { EnhancedAISearch };
export default EnhancedAISearch;
