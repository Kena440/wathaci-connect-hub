import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, Target, DollarSign } from 'lucide-react';

interface ImpactMetric {
  title: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

const ImpactDashboard = () => {
  const metrics: ImpactMetric[] = [
    { title: 'Jobs Created', value: 1247, target: 1500, unit: 'jobs', trend: 'up' },
    { title: 'SMEs Supported', value: 89, target: 100, unit: 'businesses', trend: 'up' },
    { title: 'Funding Distributed', value: 2.4, target: 3.0, unit: 'M ZMW', trend: 'up' },
    { title: 'Training Sessions', value: 156, target: 200, unit: 'sessions', trend: 'stable' }
  ];

  const getProgressPercentage = (value: number, target: number) => {
    return Math.min((value / target) * 100, 100);
  };

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? <TrendingUp className="w-4 h-4 text-green-500" /> : null;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {metric.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold">
                  {metric.value}{metric.unit === 'M ZMW' ? 'M' : ''}
                </span>
                {getTrendIcon(metric.trend)}
              </div>
              <Progress 
                value={getProgressPercentage(metric.value, metric.target)} 
                className="mb-2"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{metric.value} {metric.unit}</span>
                <span>Target: {metric.target} {metric.unit}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Impact Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { activity: 'Youth Employment Program Launch', impact: '50 new jobs', date: '2 days ago' },
              { activity: 'Women Entrepreneurs Training', impact: '25 businesses trained', date: '1 week ago' },
              { activity: 'Rural SME Funding Round', impact: 'ZMW 500,000 distributed', date: '2 weeks ago' }
            ].map((item, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{item.activity}</p>
                  <p className="text-sm text-gray-600">{item.impact}</p>
                </div>
                <Badge variant="outline">{item.date}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImpactDashboard;