/**
 * Document Generation Status
 * Real-time status tracking for document generation
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText,
  Presentation,
  Download,
  RefreshCw,
  ArrowLeft,
  Clock,
  Sparkles,
} from 'lucide-react';
import { documentGeneratorService, DOCUMENT_LABELS } from '@/lib/services/document-generator-service';
import { formatAmount } from '@/lib/payment-config';
import type { PaidDocumentRequest, GenerationStatus } from '@/@types/database';
import { AppLayout } from '@/components/AppLayout';

const STATUS_MESSAGES: Record<GenerationStatus, { text: string; progress: number }> = {
  not_started: { text: 'Waiting for payment confirmation...', progress: 0 },
  queued: { text: 'Your document is in the queue...', progress: 20 },
  processing: { text: 'AI is generating your document...', progress: 60 },
  completed: { text: 'Your document is ready!', progress: 100 },
  failed: { text: 'Generation failed. Please try again.', progress: 0 },
};

const PROCESSING_STEPS = [
  { id: 'prepare', label: 'Preparing data', icon: FileText },
  { id: 'ai', label: 'Running AI model', icon: Sparkles },
  { id: 'render', label: 'Rendering document', icon: FileText },
  { id: 'finalize', label: 'Finalizing', icon: CheckCircle },
];

export const DocumentGenerationStatus = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<PaidDocumentRequest | null>(null);
  const [logs, setLogs] = useState<Array<{ message: string; created_at: string; log_type: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);

  // Fetch document status
  const fetchStatus = async () => {
    if (!documentId) return;

    try {
      const result = await documentGeneratorService.getDocumentRequest(documentId);
      if (result.success && result.data) {
        setDocument(result.data);
      } else {
        setError(result.error || 'Failed to load document status');
      }

      // Fetch generation logs
      const statusResult = await documentGeneratorService.getGenerationStatus(documentId);
      if (statusResult) {
        setLogs(statusResult.logs);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Poll for updates while processing
  useEffect(() => {
    fetchStatus();

    // Poll every 3 seconds while processing
    const interval = setInterval(() => {
      if (document?.generation_status === 'processing' || document?.generation_status === 'queued') {
        fetchStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, document?.generation_status]);

  const handleDownload = async (fileType: 'pdf' | 'docx') => {
    if (!documentId) return;

    const setDownloading = fileType === 'pdf' ? setDownloadingPdf : setDownloadingDocx;
    setDownloading(true);

    try {
      const result = await documentGeneratorService.getSignedDownloadUrl(documentId, fileType);
      if (result.success && result.url) {
        window.open(result.url, '_blank');
      } else {
        setError(result.error || 'Failed to generate download link');
      }
    } catch (err: any) {
      setError(err.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleRetry = async () => {
    if (!documentId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await documentGeneratorService.triggerGeneration(documentId);
      if (result.success) {
        setDocument(result.data || null);
      } else {
        setError(result.error || 'Failed to retry generation');
      }
    } catch (err: any) {
      setError(err.message || 'Retry failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-16 px-4 flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
          <p className="text-muted-foreground">Loading document status...</p>
        </div>
      </AppLayout>
    );
  }

  if (error && !document) {
    return (
      <AppLayout>
        <div className="container mx-auto py-16 px-4 max-w-lg">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => navigate('/document-generator')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (!document) {
    return (
      <AppLayout>
        <div className="container mx-auto py-16 px-4 max-w-lg text-center">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium mb-2">Document Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This document request doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate('/document-generator')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go to Dashboard
          </Button>
        </div>
      </AppLayout>
    );
  }

  const status = STATUS_MESSAGES[document.generation_status];
  const DocumentIcon = document.document_type === 'business_plan' ? FileText : Presentation;
  const isCompleted = document.generation_status === 'completed';
  const isFailed = document.generation_status === 'failed';
  const isProcessing = document.generation_status === 'processing' || document.generation_status === 'queued';

  // Calculate active step based on status
  const activeStep = isCompleted
    ? 4
    : isFailed
    ? 0
    : document.generation_status === 'processing'
    ? 2
    : document.generation_status === 'queued'
    ? 1
    : 0;

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/document-generator')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div
                className={`p-4 rounded-full ${
                  isCompleted
                    ? 'bg-green-100'
                    : isFailed
                    ? 'bg-red-100'
                    : 'bg-blue-100'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="h-10 w-10 text-green-600" />
                ) : isFailed ? (
                  <AlertCircle className="h-10 w-10 text-red-600" />
                ) : (
                  <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl">
              {isCompleted
                ? 'Your Document is Ready!'
                : isFailed
                ? 'Generation Failed'
                : 'Generating Your Document'}
            </CardTitle>
            <CardDescription className="flex items-center justify-center gap-2">
              <DocumentIcon className="h-4 w-4" />
              {DOCUMENT_LABELS[document.document_type]}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Progress Bar */}
            {!isFailed && (
              <div className="space-y-2">
                <Progress value={status.progress} className="h-2" />
                <p className="text-sm text-center text-muted-foreground">{status.text}</p>
              </div>
            )}

            {/* Processing Steps */}
            {isProcessing && (
              <div className="space-y-3 py-4">
                {PROCESSING_STEPS.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = index === activeStep;
                  const isCompleted = index < activeStep;

                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : isCompleted
                          ? 'text-green-600'
                          : 'text-gray-400'
                      }`}
                    >
                      {isActive ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <StepIcon className="h-5 w-5" />
                      )}
                      <span className={isActive ? 'font-medium' : ''}>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Estimated Time */}
            {isProcessing && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Average wait time: 30–60 seconds</span>
              </div>
            )}

            {/* Download Buttons - Only show when completed */}
            {isCompleted && (
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => handleDownload('pdf')}
                    disabled={downloadingPdf}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {downloadingPdf ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Download PDF
                  </Button>
                  <Button
                    onClick={() => handleDownload('docx')}
                    disabled={downloadingDocx}
                    variant="outline"
                  >
                    {downloadingDocx ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Download Word
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Download links expire after 30 minutes. You can return to this page to download
                  again.
                </p>
              </div>
            )}

            {/* Retry Button - Only show when failed */}
            {isFailed && (
              <div className="space-y-4 pt-4">
                <Button onClick={handleRetry} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Generation
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  No additional charge will be applied for retrying.
                </p>
              </div>
            )}

            {/* Generation Logs */}
            {logs.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Activity Log</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {logs.map((log, index) => (
                    <div key={index} className="flex items-start gap-2 text-xs">
                      <span className="text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                      <span
                        className={
                          log.log_type === 'error'
                            ? 'text-red-600'
                            : log.log_type === 'success'
                            ? 'text-green-600'
                            : 'text-gray-600'
                        }
                      >
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Regenerate Option */}
            {isCompleted && (
              <div className="border-t pt-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Need to update your document?
                </p>
                <Button
                  variant="link"
                  onClick={() =>
                    navigate(
                      `/document-generator/${
                        document.document_type === 'business_plan' ? 'business-plan' : 'pitch-deck'
                      }`
                    )
                  }
                >
                  Regenerate ({formatAmount(document.amount)})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};
