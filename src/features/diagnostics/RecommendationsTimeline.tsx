/**
 * Recommendations Timeline Component
 * 
 * Displays recommendations organized by timeline (Now, Next, Later).
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Calendar, 
  CalendarDays,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Users,
} from 'lucide-react';
import type { Recommendation, Bottleneck } from '@/@types/diagnostics';

interface RecommendationsTimelineProps {
  recommendations: Recommendation[];
  bottlenecks: Bottleneck[];
}

interface TimelineSection {
  title: string;
  timeframe: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  items: Recommendation[];
}

const getDifficultyBadge = (difficulty: string) => {
  const config = {
    easy: { label: 'Easy', class: 'bg-green-100 text-green-800' },
    medium: { label: 'Medium', class: 'bg-yellow-100 text-yellow-800' },
    hard: { label: 'Hard', class: 'bg-red-100 text-red-800' },
  };
  const d = config[difficulty as keyof typeof config] || config.medium;
  return <Badge className={d.class}>{d.label}</Badge>;
};

const RecommendationCard = ({ rec, isExpanded, onToggle }: { 
  rec: Recommendation; 
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
      <div 
        className="flex items-start gap-3 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-semibold text-sm flex-shrink-0">
          {rec.priority}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              {rec.area}
            </Badge>
            {getDifficultyBadge(rec.difficulty)}
          </div>
          <h4 className="font-medium text-gray-900">{rec.action}</h4>
          <p className="text-sm text-gray-500 mt-1">
            <Clock className="w-3 h-3 inline mr-1" />
            {rec.estimated_time}
          </p>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
      </div>

      {isExpanded && (
        <div className="mt-4 pl-11 space-y-4">
          {/* Why */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-1">Why is this important?</h5>
            <p className="text-sm text-gray-600">{rec.why}</p>
          </div>

          {/* How */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">How to do it:</h5>
            <ol className="space-y-2">
              {rec.how.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs flex-shrink-0">
                    {idx + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Action Button */}
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="w-4 h-4" />
            Find Support
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export const RecommendationsTimeline = ({ recommendations, bottlenecks }: RecommendationsTimelineProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group recommendations by timeline
  const now = recommendations.filter(r => r.timeline_category === 'NOW');
  const next = recommendations.filter(r => r.timeline_category === 'NEXT');
  const later = recommendations.filter(r => r.timeline_category === 'LATER');

  const sections: TimelineSection[] = [
    {
      title: 'Now',
      timeframe: '0-3 months',
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      items: now,
    },
    {
      title: 'Next',
      timeframe: '3-12 months',
      icon: <Calendar className="w-5 h-5" />,
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-50',
      items: next,
    },
    {
      title: 'Later',
      timeframe: '12+ months',
      icon: <CalendarDays className="w-5 h-5" />,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      items: later,
    },
  ];

  // Show urgent bottlenecks summary
  const urgentBottlenecks = bottlenecks.filter(b => b.severity === 'high' || b.severity === 'critical');

  return (
    <div className="space-y-6">
      {/* Urgent Bottlenecks Warning */}
      {urgentBottlenecks.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Urgent Bottlenecks Identified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {urgentBottlenecks.map((b) => (
                <li key={b.id} className="flex items-start gap-2">
                  <Badge variant="destructive" className="text-xs flex-shrink-0">
                    {b.severity}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{b.description}</p>
                    <p className="text-xs text-gray-600">{b.impact}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Timeline Sections */}
      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader className={`${section.bgColor} rounded-t-lg`}>
            <CardTitle className={`flex items-center gap-2 ${section.color}`}>
              {section.icon}
              {section.title}
              <Badge variant="secondary" className="ml-auto">
                {section.items.length} actions
              </Badge>
            </CardTitle>
            <CardDescription className={section.color}>
              {section.timeframe}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {section.items.length === 0 ? (
              <div className="flex items-center gap-2 text-gray-500 py-4">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <p className="text-sm">No actions needed in this timeframe</p>
              </div>
            ) : (
              <div className="space-y-3">
                {section.items.map((rec) => (
                  <RecommendationCard
                    key={rec.id}
                    rec={rec}
                    isExpanded={expandedId === rec.id}
                    onToggle={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default RecommendationsTimeline;
