import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Star,
  DollarSign,
  Clock,
  MessageCircle,
  ExternalLink,
  Award,
  Target
} from 'lucide-react';
import { SMENeedsAssessment, AssessmentRecommendation } from '@/@types/database';

interface AssessmentResultsProps {
  assessment: SMENeedsAssessment;
  recommendations: Array<{
    professional: {
      id: string;
      name: string;
      expertise: string[];
      experience: string;
      successRate: number;
      rating: number;
      hourlyRate: string;
      availability: string;
      bio?: string;
      qualifications?: Array<{
        name: string;
        institution: string;
        year: number;
      }>;
    };
    matchScore: number;
    recommendedFor: string[];
    aiReasoning: string;
  }>;
  onContactProfessional: (professionalId: string) => void;
  onRetakeAssessment: () => void;
}

export const AssessmentResults: React.FC<AssessmentResultsProps> = ({
  assessment,
  recommendations,
  onContactProfessional,
  onRetakeAssessment
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreDescription = (score: number) => {
    if (score >= 80) return 'Excellent - Your business is well-positioned for growth';
    if (score >= 60) return 'Good - Some areas need attention for optimal performance';
    return 'Needs Improvement - Several critical areas require immediate attention';
  };

  const getPriorityColor = (index: number) => {
    if (index === 0) return 'bg-red-100 text-red-800 border-red-200';
    if (index === 1) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (index === 2) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatCurrency = (amount: number) => {
    return `ZMW ${amount.toLocaleString()}`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Overall Score Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Your Business Health Assessment</CardTitle>
              <CardDescription>
                Completed on {new Date(assessment.completed_at).toLocaleDateString()}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={onRetakeAssessment}>
              Retake Assessment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-32 h-32">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold ${getScoreColor(assessment.overall_score)}`}>
                {assessment.overall_score}%
              </div>
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">
              {getScoreDescription(assessment.overall_score)}
            </h3>
            <Progress value={assessment.overall_score} className="h-3 mb-4" />
          </div>
        </CardContent>
      </Card>

      {/* Identified Gaps and Priority Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
              Identified Business Gaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assessment.identified_gaps.map((gap, index) => (
                <div key={index} className="flex items-center p-3 bg-orange-50 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-orange-600 mr-2 flex-shrink-0" />
                  <span className="text-sm font-medium">{gap}</span>
                </div>
              ))}
              {assessment.identified_gaps.length === 0 && (
                <div className="flex items-center p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm text-green-800">No critical gaps identified</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2 text-red-600" />
              Priority Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assessment.priority_areas.map((area, index) => (
                <div key={index} className={`flex items-center p-3 rounded-lg border ${getPriorityColor(index)}`}>
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white text-xs font-bold mr-3">
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium">{area}</span>
                </div>
              ))}
              {assessment.priority_areas.length === 0 && (
                <div className="flex items-center p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm text-green-800">All areas performing well</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-green-600" />
            Financial Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(assessment.monthly_revenue)}
              </div>
              <div className="text-sm text-gray-600">Monthly Revenue</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(assessment.monthly_expenses)}
              </div>
              <div className="text-sm text-gray-600">Monthly Expenses</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(assessment.debt_obligations)}
              </div>
              <div className="text-sm text-gray-600">Debt Obligations</div>
            </div>
            <div className={`p-4 rounded-lg ${assessment.cash_flow_positive ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className={`text-2xl font-bold ${assessment.cash_flow_positive ? 'text-green-600' : 'text-red-600'}`}>
                {assessment.cash_flow_positive ? 'Positive' : 'Negative'}
              </div>
              <div className="text-sm text-gray-600">Cash Flow</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Funding Requirements */}
      {assessment.funding_requirements.amount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
              Funding Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-lg font-semibold text-purple-600">
                  {formatCurrency(assessment.funding_requirements.amount)}
                </div>
                <div className="text-sm text-gray-600">Amount Needed</div>
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {assessment.funding_requirements.timeline}
                </div>
                <div className="text-sm text-gray-600">Timeline</div>
              </div>
              <div>
                <Badge variant="outline" className="text-xs">
                  {assessment.funding_requirements.purpose.substring(0, 50)}...
                </Badge>
                <div className="text-sm text-gray-600 mt-1">Purpose</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Professional Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2 text-indigo-600" />
              Recommended Professionals
              <Badge variant="secondary" className="ml-2">
                AI-Powered Matches
              </Badge>
            </CardTitle>
            <CardDescription>
              Based on your assessment, here are professionals who can help address your business needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              {recommendations.map((rec, index) => (
                <Card key={index} className="border-l-4 border-l-indigo-500">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{rec.professional.name}</h3>
                          <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                            {rec.matchScore}% Match
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-2">{rec.professional.experience} experience</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Star className="w-4 h-4 mr-1 text-yellow-500" />
                            {rec.professional.rating.toFixed(1)}
                          </div>
                          <div className="flex items-center">
                            <Award className="w-4 h-4 mr-1 text-green-500" />
                            {(rec.professional.successRate * 100).toFixed(0)}% Success Rate
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1 text-blue-500" />
                            {rec.professional.availability}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-green-600">
                          {rec.professional.hourlyRate}
                        </div>
                        <div className="text-sm text-gray-500">per hour</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium mb-2">Expertise Areas:</div>
                        <div className="flex flex-wrap gap-2">
                          {rec.professional.expertise.map((skill, skillIndex) => (
                            <Badge key={skillIndex} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium mb-2">Recommended For:</div>
                        <div className="flex flex-wrap gap-2">
                          {rec.recommendedFor.map((area, areaIndex) => (
                            <Badge key={areaIndex} variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-sm font-medium mb-1">AI Recommendation:</div>
                        <p className="text-sm text-blue-800">{rec.aiReasoning}</p>
                      </div>

                      {rec.professional.qualifications && rec.professional.qualifications.length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-2">Key Qualifications:</div>
                          <div className="space-y-1">
                            {rec.professional.qualifications.slice(0, 2).map((qual, qualIndex) => (
                              <div key={qualIndex} className="text-sm text-gray-600">
                                • {qual.name} - {qual.institution} ({qual.year})
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator className="my-4" />

                    <div className="flex gap-3">
                      <Button 
                        onClick={() => onContactProfessional(rec.professional.id)}
                        className="flex-1"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Contact Professional
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Full Profile
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            Recommended Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {assessment.priority_areas.length > 0 && (
              <div className="flex items-start space-x-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-800 text-sm font-bold">
                  1
                </div>
                <div>
                  <div className="font-medium">Address Priority Areas</div>
                  <div className="text-sm text-gray-600">
                    Focus on your top 3 priority areas: {assessment.priority_areas.slice(0, 3).join(', ')}
                  </div>
                </div>
              </div>
            )}
            
            {recommendations.length > 0 && (
              <div className="flex items-start space-x-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-sm font-bold">
                  2
                </div>
                <div>
                  <div className="font-medium">Connect with Recommended Professionals</div>
                  <div className="text-sm text-gray-600">
                    Start with the highest-matched professionals who can address your immediate needs
                  </div>
                </div>
              </div>
            )}

            {assessment.funding_requirements.amount > 0 && (
              <div className="flex items-start space-x-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800 text-sm font-bold">
                  3
                </div>
                <div>
                  <div className="font-medium">Explore Funding Options</div>
                  <div className="text-sm text-gray-600">
                    Visit our Funding Hub to find opportunities that match your {formatCurrency(assessment.funding_requirements.amount)} requirement
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start space-x-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-800 text-sm font-bold">
                4
              </div>
              <div>
                <div className="font-medium">Schedule Follow-up Assessment</div>
                <div className="text-sm text-gray-600">
                  Retake this assessment in 3-6 months to track your progress and get updated recommendations
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};