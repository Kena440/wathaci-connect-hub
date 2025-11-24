/**
 * Document Generator Dashboard
 * Main page for AI Business Plan and Pitch Deck generation
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  Presentation,
  Sparkles,
  Clock,
  Download,
  Plus,
  CheckCircle,
  AlertCircle,
  Loader2,
  CreditCard,
  Info,
} from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { documentGeneratorService, DOCUMENT_PRICES, DOCUMENT_LABELS } from '@/lib/services/document-generator-service';
import { formatAmount } from '@/lib/payment-config';
import type { PaidDocumentRequest, DocumentType } from '@/@types/database';
import { AppLayout } from '@/components/AppLayout';

interface DocumentCardProps {
  type: DocumentType;
  onGenerate: () => void;
}

const DocumentCard = ({ type, onGenerate }: DocumentCardProps) => {
  const icon = type === 'business_plan' ? FileText : Presentation;
  const Icon = icon;
  const price = DOCUMENT_PRICES[type];
  const label = DOCUMENT_LABELS[type];

  const features =
    type === 'business_plan'
      ? [
          'Executive Summary',
          'Market Analysis',
          'Financial Projections',
          'SWOT Analysis',
          'Milestones & Goals',
          'Team Structure',
        ]
      : [
          'Problem & Solution',
          'Market Opportunity',
          'Business Model',
          'Traction Metrics',
          'Team Profiles',
          'Financial Ask',
        ];

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-bl-full opacity-50" />
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-xl">{label}</CardTitle>
            <CardDescription className="text-lg font-semibold text-green-600">
              {formatAmount(price)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-yellow-500" />
          <span>AI-Powered Professional Document</span>
        </div>

        <ul className="space-y-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              {feature}
            </li>
          ))}
        </ul>

        <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
          <div className="flex items-center gap-2 mb-1">
            <Info className="h-4 w-4" />
            <span className="font-medium">Why it costs:</span>
          </div>
          <p className="text-xs">
            This covers AI compute, document rendering, formatting, and secure cloud storage.
          </p>
        </div>

        <Button onClick={onGenerate} className="w-full" size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Generate {type === 'business_plan' ? 'Business Plan' : 'Pitch Deck'}
        </Button>
      </CardContent>
    </Card>
  );
};

interface DocumentHistoryItemProps {
  document: PaidDocumentRequest;
  onView: () => void;
}

const DocumentHistoryItem = ({ document, onView }: DocumentHistoryItemProps) => {
  const getStatusBadge = () => {
    if (document.payment_status === 'pending') {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Payment Pending</Badge>;
    }
    if (document.payment_status === 'failed') {
      return <Badge variant="destructive">Payment Failed</Badge>;
    }
    if (document.generation_status === 'processing' || document.generation_status === 'queued') {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700">Generating...</Badge>;
    }
    if (document.generation_status === 'completed') {
      return <Badge variant="outline" className="bg-green-50 text-green-700">Ready</Badge>;
    }
    if (document.generation_status === 'failed') {
      return <Badge variant="destructive">Generation Failed</Badge>;
    }
    return <Badge variant="outline">Draft</Badge>;
  };

  const Icon = document.document_type === 'business_plan' ? FileText : Presentation;
  const createdAt = new Date(document.created_at).toLocaleDateString();

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-gray-100 rounded-lg">
          <Icon className="h-5 w-5 text-gray-600" />
        </div>
        <div>
          <p className="font-medium">{DOCUMENT_LABELS[document.document_type]}</p>
          <p className="text-sm text-muted-foreground">
            Created {createdAt} • {formatAmount(document.amount)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {getStatusBadge()}
        <Button variant="outline" size="sm" onClick={onView}>
          {document.generation_status === 'completed' ? (
            <>
              <Download className="h-4 w-4 mr-1" />
              Download
            </>
          ) : (
            'View'
          )}
        </Button>
      </div>
    </div>
  );
};

export const DocumentGeneratorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAppContext();
  const [documents, setDocuments] = useState<PaidDocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDocuments = async () => {
      if (!user?.id) return;

      setLoading(true);
      const result = await documentGeneratorService.getUserDocuments(user.id);
      
      if (result.success && result.data) {
        setDocuments(result.data);
      } else {
        setError(result.error || 'Failed to load documents');
      }
      setLoading(false);
    };

    loadDocuments();
  }, [user?.id]);

  const handleGenerateBusinessPlan = () => {
    navigate('/document-generator/business-plan');
  };

  const handleGeneratePitchDeck = () => {
    navigate('/document-generator/pitch-deck');
  };

  const handleViewDocument = (documentId: string) => {
    navigate(`/document-generator/view/${documentId}`);
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">AI Document Generator</h1>
          <p className="text-muted-foreground">
            Create professional business documents powered by AI. Each document is tailored to your
            specific business needs.
          </p>
        </div>

        {/* Pricing Notice */}
        <Alert className="mb-8 border-blue-200 bg-blue-50">
          <CreditCard className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Premium Feature:</strong> AI Business Plan ({formatAmount(DOCUMENT_PRICES.business_plan)}) and
            AI Investor Pitch Deck ({formatAmount(DOCUMENT_PRICES.pitch_deck)}) are premium features
            that require one-time payment per document. This is not included in your subscription.
          </AlertDescription>
        </Alert>

        {/* Bundle Offer */}
        <Card className="mb-8 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Bundle Offer: Both Documents</h3>
                  <p className="text-sm text-muted-foreground">
                    Get both Business Plan and Pitch Deck for {formatAmount(DOCUMENT_PRICES.bundle)}
                  </p>
                </div>
              </div>
              <Button
                variant="default"
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => {
                  // Navigate to business plan first, then offer pitch deck after payment
                  navigate('/document-generator/business-plan');
                }}
              >
                Get Both Documents
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList>
            <TabsTrigger value="generate">Generate New</TabsTrigger>
            <TabsTrigger value="history">My Documents ({documents.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <DocumentCard type="business_plan" onGenerate={handleGenerateBusinessPlan} />
              <DocumentCard type="pitch_deck" onGenerate={handleGeneratePitchDeck} />
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : documents.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Documents Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate your first AI-powered document to get started.
                  </p>
                  <div className="flex justify-center gap-4">
                    <Button onClick={handleGenerateBusinessPlan}>
                      <FileText className="h-4 w-4 mr-2" />
                      Business Plan
                    </Button>
                    <Button variant="outline" onClick={handleGeneratePitchDeck}>
                      <Presentation className="h-4 w-4 mr-2" />
                      Pitch Deck
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <DocumentHistoryItem
                    key={doc.id}
                    document={doc}
                    onView={() => handleViewDocument(doc.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};
