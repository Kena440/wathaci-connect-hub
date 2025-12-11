import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { supabase } from '@/lib/supabase-enhanced';
import { generateProfessionalMatches } from '@/data/marketplace';
import { useAppContext } from '../contexts/AppContext';

export const GapMatcher: React.FC = () => {
  const [gaps, setGaps] = useState('');
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const { user } = useAppContext();

  const findMatches = async () => {
    if (!gaps.trim() || !user?.id) return;
    
    setLoading(true);
    try {
      const gapsList = gaps.split(',').map(g => g.trim()).filter(Boolean);
      
      const { data, error } = await supabase.functions.invoke('ai-professional-matcher', {
        body: {
          smeId: user.id,
          gaps: gapsList,
          smeDetails: user
        }
      });

      if (error) throw error;
      const fallbackMatches = generateProfessionalMatches(gapsList);
      setMatches(data?.matches?.length ? data.matches : fallbackMatches);
    } catch (error) {
      console.error('Error finding matches:', error);
      setMatches(generateProfessionalMatches(gapsList));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Find Professional Help</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Textarea
            placeholder="Describe your business gaps or challenges (separate with commas)..."
            value={gaps}
            onChange={(e) => setGaps(e.target.value)}
            rows={3}
          />
        </div>
        
        <Button onClick={findMatches} disabled={loading || !gaps.trim()}>
          {loading ? 'Finding Matches...' : 'Find Professional Matches'}
        </Button>

        {matches.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Recommended Professionals:</h3>
            {matches.map((match, index) => (
              <Card key={index} className="p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{match.full_name}</h4>
                    <p className="text-sm text-gray-600">{match.expertise_areas?.join(', ')}</p>
                    <p className="text-xs text-green-600">Match Score: {(match.score * 100).toFixed(0)}%</p>
                  </div>
                  <Button size="sm">Contact</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};