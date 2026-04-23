import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Users, TrendingUp, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface Suggestion {
  id: string;
  type: 'partnership' | 'skill_exchange' | 'project' | 'mentorship';
  title: string;
  description: string;
  matchScore: number;
  participants: string[];
  tags: string[];
  potentialValue: string;
}

export const CollaborationSuggestions = ({ userProfile }: { userProfile?: any }) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-professional-matcher', {
        body: {
          type: 'collaboration_suggestions',
          userProfile,
        },
      });

      if (error) throw error;

      setSuggestions(data?.suggestions || []);
    } catch (err) {
      console.error('Error generating suggestions:', err);
      setError('Failed to generate suggestions. Please try again.');
      setSuggestions([]);
    }

    setLoading(false);
  }, [userProfile]);

  useEffect(() => {
    generateSuggestions();
  }, [generateSuggestions]);

  const handleInterest = (suggestionId: string, action: 'interested' | 'not_interested') => {
    if (action === 'interested') {
      toast({
        title: "Interest registered!",
        description: "We'll connect you with potential collaborators soon.",
      });
    }
    
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'partnership': return <Users className="w-5 h-5 text-blue-500" />;
      case 'skill_exchange': return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'project': return <Lightbulb className="w-5 h-5 text-yellow-500" />;
      case 'mentorship': return <MessageCircle className="w-5 h-5 text-purple-500" />;
      default: return <Lightbulb className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'partnership': return 'bg-blue-100 text-blue-800';
      case 'skill_exchange': return 'bg-green-100 text-green-800';
      case 'project': return 'bg-yellow-100 text-yellow-800';
      case 'mentorship': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-6 h-6 text-yellow-500" />
          <h2 className="text-2xl font-bold">AI-Powered Collaboration Suggestions</h2>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="text-center p-8">
        <CardContent>
          <Lightbulb className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Unable to load suggestions</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={generateSuggestions}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-6 h-6 text-yellow-500" />
        <h2 className="text-2xl font-bold">AI-Powered Collaboration Suggestions</h2>
      </div>
      
      {suggestions.length === 0 ? (
        <Card className="text-center p-8">
          <CardContent>
            <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No suggestions available</h3>
            <p className="text-gray-600 mb-4">Complete your profile to get personalized collaboration suggestions.</p>
            <Button onClick={generateSuggestions}>Refresh Suggestions</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(suggestion.type)}
                    <div>
                      <CardTitle className="text-xl">{suggestion.title}</CardTitle>
                      <Badge className={`mt-1 ${getTypeColor(suggestion.type)}`}>
                        {suggestion.type.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">{suggestion.matchScore}%</div>
                    <div className="text-xs text-gray-500">Match Score</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">{suggestion.description}</p>
                
                <div>
                  <h4 className="font-semibold mb-2">Potential Participants:</h4>
                  <div className="flex flex-wrap gap-2">
                    {suggestion.participants.map((participant, idx) => (
                      <Badge key={idx} variant="outline">{participant}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Tags:</h4>
                  <div className="flex flex-wrap gap-2">
                    {suggestion.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <span className="text-sm text-gray-600">Potential Value: </span>
                    <span className="font-semibold text-green-600">{suggestion.potentialValue}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleInterest(suggestion.id, 'not_interested')}
                    >
                      Not Interested
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => handleInterest(suggestion.id, 'interested')}
                    >
                      I'm Interested
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <div className="text-center">
        <Button variant="outline" onClick={generateSuggestions}>
          Generate More Suggestions
        </Button>
      </div>
    </div>
  );
};