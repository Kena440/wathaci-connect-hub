/**
 * SWOT Display Component
 * 
 * Displays the SWOT analysis in a 4-quadrant visual layout.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  AlertCircle, 
  TrendingUp, 
  ShieldAlert 
} from 'lucide-react';
import type { SWOTAnalysis, SWOTItem } from '@/@types/diagnostics';

interface SWOTDisplayProps {
  swot: SWOTAnalysis;
}

interface QuadrantProps {
  title: string;
  items: SWOTItem[];
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
}

const Quadrant = ({ title, items, icon, colorClass, bgClass }: QuadrantProps) => (
  <Card className={`${bgClass} border-none`}>
    <CardHeader className="pb-3">
      <CardTitle className={`text-lg font-semibold flex items-center gap-2 ${colorClass}`}>
        {icon}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No items identified</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2">
              <span className={`text-lg leading-none ${colorClass}`}>•</span>
              <div className="flex-1">
                <p className="text-sm text-gray-700">{item.text}</p>
                {item.category && (
                  <Badge variant="outline" className="mt-1 text-xs">
                    {item.category}
                  </Badge>
                )}
              </div>
              {item.importance === 'high' && (
                <Badge variant="secondary" className="text-xs bg-gray-200">
                  Key
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </CardContent>
  </Card>
);

export const SWOTDisplay = ({ swot }: SWOTDisplayProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Strengths - Green */}
      <Quadrant
        title="Strengths"
        items={swot.strengths}
        icon={<Zap className="w-5 h-5" />}
        colorClass="text-green-700"
        bgClass="bg-green-50"
      />

      {/* Weaknesses - Red */}
      <Quadrant
        title="Weaknesses"
        items={swot.weaknesses}
        icon={<AlertCircle className="w-5 h-5" />}
        colorClass="text-red-700"
        bgClass="bg-red-50"
      />

      {/* Opportunities - Blue */}
      <Quadrant
        title="Opportunities"
        items={swot.opportunities}
        icon={<TrendingUp className="w-5 h-5" />}
        colorClass="text-blue-700"
        bgClass="bg-blue-50"
      />

      {/* Threats - Orange */}
      <Quadrant
        title="Threats"
        items={swot.threats}
        icon={<ShieldAlert className="w-5 h-5" />}
        colorClass="text-orange-700"
        bgClass="bg-orange-50"
      />
    </div>
  );
};

export default SWOTDisplay;
