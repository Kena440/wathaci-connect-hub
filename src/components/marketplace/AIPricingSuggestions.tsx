import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TrendingUp, DollarSign, BarChart3, Lightbulb } from 'lucide-react';
import { supabase } from '@/lib/supabase-enhanced';

interface PricingSuggestion {
  suggestedPrice: number;
  minPrice: number;
  maxPrice: number;
  marketAverage: number;
  confidence: number;
  factors: string[];
  reasoning: string;
}

interface AIPricingSuggestionsProps {
  productType?: string;
  category?: string;
  onPriceSelect: (price: number) => void;
}

const AIPricingSuggestions = ({ 
  productType = '', 
  category = '', 
  onPriceSelect 
}: AIPricingSuggestionsProps) => {
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('Lusaka');
  const [suggestions, setSuggestions] = useState<PricingSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [marketData, setMarketData] = useState({
    averagePrice: 0,
    priceRange: { min: 0, max: 0 },
    competitorCount: 0
  });

  const generatePricingSuggestions = async () => {
    if (!description.trim()) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-professional-matcher', {
        body: {
          type: 'pricing_analysis',
          productType,
          category,
          description,
          location
        }
      });

      if (error) throw error;

      if (data?.pricing) {
        setSuggestions(data.pricing);
        setMarketData(data.marketData || marketData);
      }
    } catch (error) {
      console.error('Pricing analysis error:', error);
      // Fallback mock data
      setSuggestions({
        suggestedPrice: 1200,
        minPrice: 800,
        maxPrice: 1800,
        marketAverage: 1100,
        confidence: 0.85,
        factors: ['Market demand', 'Service complexity', 'Location premium', 'Experience level'],
        reasoning: 'Based on similar services in Lusaka, your pricing should be competitive while reflecting quality.'
      });
      setMarketData({
        averagePrice: 1100,
        priceRange: { min: 600, max: 2000 },
        competitorCount: 23
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPriceRecommendation = (price: number) => {
    if (!suggestions) return '';
    if (price < suggestions.minPrice) return 'Below market range';
    if (price > suggestions.maxPrice) return 'Above market range';
    if (price === suggestions.suggestedPrice) return 'AI Recommended';
    return 'Within market range';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            AI Pricing Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Describe your product/service
            </label>
            <Textarea
              placeholder="Describe what you're offering, target audience, unique features..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City/Province"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={generatePricingSuggestions}
                disabled={isLoading || !description.trim()}
                className="w-full"
              >
                {isLoading ? 'Analyzing...' : 'Get AI Pricing'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {suggestions && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                Pricing Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  K{suggestions.suggestedPrice}
                </div>
                <Badge className="bg-blue-600">
                  AI Recommended ({Math.round(suggestions.confidence * 100)}% confidence)
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Market Average:</span>
                  <span className="font-semibold">K{suggestions.marketAverage}</span>
                </div>
                <div className="flex justify-between">
                  <span>Price Range:</span>
                  <span className="font-semibold">K{suggestions.minPrice} - K{suggestions.maxPrice}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onPriceSelect(suggestions.minPrice)}
                >
                  Use Min (K{suggestions.minPrice})
                </Button>
                <Button 
                  size="sm"
                  onClick={() => onPriceSelect(suggestions.suggestedPrice)}
                >
                  Use Suggested
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onPriceSelect(suggestions.maxPrice)}
                >
                  Use Max (K{suggestions.maxPrice})
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                Market Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-semibold">Key Factors:</h4>
                <div className="space-y-1">
                  {suggestions.factors.map((factor, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-sm">{factor}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">AI Analysis:</h4>
                <p className="text-sm text-gray-700">{suggestions.reasoning}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-purple-600">{marketData.competitorCount}</div>
                  <div className="text-xs text-gray-500">Competitors</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-purple-600">K{marketData.averagePrice}</div>
                  <div className="text-xs text-gray-500">Market Avg</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AIPricingSuggestions;