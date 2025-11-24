/**
 * ScoreCard Component
 * 
 * Displays a single score metric with visual progress indicator.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useState } from 'react';
import type { ScoreExplanation } from '@/@types/diagnostics';
import type { LucideIcon } from 'lucide-react';

interface ScoreCardProps {
  title: string;
  score: number;
  icon: LucideIcon;
  explanation: ScoreExplanation;
}

function getScoreColor(score: number): { text: string; bg: string; progress: string } {
  if (score <= 30) return { text: 'text-red-700', bg: 'bg-red-100', progress: 'bg-red-500' };
  if (score <= 60) return { text: 'text-yellow-700', bg: 'bg-yellow-100', progress: 'bg-yellow-500' };
  if (score <= 80) return { text: 'text-blue-700', bg: 'bg-blue-100', progress: 'bg-blue-500' };
  return { text: 'text-green-700', bg: 'bg-green-100', progress: 'bg-green-500' };
}

export const ScoreCard = ({ title, score, icon: Icon, explanation }: ScoreCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const colors = getScoreColor(score);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${colors.bg}`}>
              <Icon className={`w-5 h-5 ${colors.text}`} />
            </div>
            <CardTitle className="text-base font-medium">{title}</CardTitle>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 mb-2">
          <span className={`text-3xl font-bold ${colors.text}`}>{score}</span>
          <span className="text-sm text-gray-500 mb-1">/100</span>
        </div>
        
        <Progress 
          value={score} 
          className="h-2 mb-2"
        />
        
        <Badge variant="secondary" className={`${colors.bg} ${colors.text} text-xs`}>
          {explanation.band}
        </Badge>

        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {/* Positive factors */}
            {explanation.factors_positive.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-green-700 mb-2">Strengths</h5>
                <ul className="space-y-1">
                  {explanation.factors_positive.map((factor, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Negative factors */}
            {explanation.factors_negative.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-red-700 mb-2">Areas to Improve</h5>
                <ul className="space-y-1">
                  {explanation.factors_negative.map((factor, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">✕</span>
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {explanation.recommendations.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-blue-700 mb-2">Recommendations</h5>
                <ul className="space-y-1">
                  {explanation.recommendations.slice(0, 3).map((rec, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">→</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Data quality indicator */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Info className="w-3 h-3" />
              Data quality: <span className="capitalize">{explanation.data_quality}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScoreCard;
