/**
 * Document Generator Service
 * Handles AI-powered document generation for Business Plans and Pitch Decks
 */

import { supabase } from '../supabase-enhanced';
import { logger } from '../logger';
import { generatePaymentReference } from '../payment-config';
import type {
  PaidDocumentRequest,
  DocumentType,
  BusinessPlanInput,
  PitchDeckInput,
  DocumentOutputFiles,
  GenerationStatus,
  PaymentStatus,
} from '@/@types/database';

// Document pricing in ZMW
export const DOCUMENT_PRICES = {
  business_plan: 150,
  pitch_deck: 150,
  bundle: 300, // Both documents
} as const;

export const DOCUMENT_LABELS = {
  business_plan: 'AI Business Plan',
  pitch_deck: 'AI Investor Pitch Deck',
} as const;

export interface CreateDocumentRequestParams {
  userId: string;
  companyId: string;
  documentType: DocumentType;
  inputData: BusinessPlanInput | PitchDeckInput;
}

export interface DocumentPaymentParams {
  documentRequestId: string;
  paymentMethod: 'mobile_money' | 'card';
  phoneNumber?: string;
  provider?: 'mtn' | 'airtel' | 'zamtel';
}

export interface DocumentRequestResponse {
  success: boolean;
  data?: PaidDocumentRequest;
  error?: string;
}

export interface DocumentListResponse {
  success: boolean;
  data?: PaidDocumentRequest[];
  error?: string;
}

class DocumentGeneratorService {
  /**
   * Create a new document request (Step 1 - Data Collection)
   */
  async createDocumentRequest(params: CreateDocumentRequestParams): Promise<DocumentRequestResponse> {
    try {
      const { userId, companyId, documentType, inputData } = params;
      
      const { data, error } = await supabase
        .from('paid_document_requests')
        .insert({
          user_id: userId,
          company_id: companyId,
          document_type: documentType,
          input_data: inputData,
          amount: DOCUMENT_PRICES[documentType],
          currency: 'ZMW',
          payment_status: 'pending',
          generation_status: 'not_started',
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create document request', error, {
          userId,
          documentType,
        });
        return { success: false, error: error.message };
      }

      return { success: true, data: data as PaidDocumentRequest };
    } catch (error: any) {
      logger.error('Error creating document request', error);
      return { success: false, error: error.message || 'Failed to create document request' };
    }
  }

  /**
   * Update document request data (autosave during Step 1)
   */
  async updateDocumentRequest(
    requestId: string,
    inputData: Partial<BusinessPlanInput | PitchDeckInput>
  ): Promise<DocumentRequestResponse> {
    try {
      const { data, error } = await supabase
        .from('paid_document_requests')
        .update({ input_data: inputData })
        .eq('id', requestId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update document request', error, { requestId });
        return { success: false, error: error.message };
      }

      return { success: true, data: data as PaidDocumentRequest };
    } catch (error: any) {
      logger.error('Error updating document request', error);
      return { success: false, error: error.message || 'Failed to update document request' };
    }
  }

  /**
   * Get a specific document request
   */
  async getDocumentRequest(requestId: string): Promise<DocumentRequestResponse> {
    try {
      const { data, error } = await supabase
        .from('paid_document_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error) {
        logger.error('Failed to get document request', error, { requestId });
        return { success: false, error: error.message };
      }

      return { success: true, data: data as PaidDocumentRequest };
    } catch (error: any) {
      logger.error('Error getting document request', error);
      return { success: false, error: error.message || 'Failed to get document request' };
    }
  }

  /**
   * Get all document requests for a user
   */
  async getUserDocuments(userId: string): Promise<DocumentListResponse> {
    try {
      const { data, error } = await supabase
        .from('paid_document_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to get user documents', error, { userId });
        return { success: false, error: error.message };
      }

      return { success: true, data: data as PaidDocumentRequest[] };
    } catch (error: any) {
      logger.error('Error getting user documents', error);
      return { success: false, error: error.message || 'Failed to get user documents' };
    }
  }

  /**
   * Initialize payment for document (Step 2)
   */
  async initializePayment(params: DocumentPaymentParams): Promise<{
    success: boolean;
    paymentReference?: string;
    paymentUrl?: string;
    error?: string;
  }> {
    try {
      const { documentRequestId, paymentMethod, phoneNumber, provider } = params;

      // Get the document request
      const { data: docRequest, error: fetchError } = await supabase
        .from('paid_document_requests')
        .select('*')
        .eq('id', documentRequestId)
        .single();

      if (fetchError || !docRequest) {
        return { success: false, error: 'Document request not found' };
      }

      // Check if already paid
      if (docRequest.payment_status === 'success') {
        return { success: false, error: 'This document has already been paid for' };
      }

      // Generate payment reference
      const paymentReference = generatePaymentReference('DOC');

      // Update document request with payment reference
      const { error: updateError } = await supabase
        .from('paid_document_requests')
        .update({
          payment_reference: paymentReference,
          payment_gateway: paymentMethod,
        })
        .eq('id', documentRequestId);

      if (updateError) {
        logger.error('Failed to update payment reference', updateError);
        return { success: false, error: 'Failed to initialize payment' };
      }

      // Call payment service via Supabase edge function
      const { data: paymentResponse, error: paymentError } = await supabase.functions.invoke(
        'document-payment',
        {
          body: {
            action: 'initialize',
            documentRequestId,
            paymentReference,
            amount: docRequest.amount,
            currency: docRequest.currency,
            paymentMethod,
            phoneNumber,
            provider,
            documentType: docRequest.document_type,
          },
        }
      );

      if (paymentError) {
        logger.error('Payment initialization failed', paymentError);
        return { success: false, error: 'Payment initialization failed' };
      }

      return {
        success: true,
        paymentReference,
        paymentUrl: paymentResponse?.payment_url,
      };
    } catch (error: any) {
      logger.error('Error initializing payment', error);
      return { success: false, error: error.message || 'Payment initialization failed' };
    }
  }

  /**
   * Handle payment confirmation (called by webhook)
   */
  async confirmPayment(paymentReference: string): Promise<DocumentRequestResponse> {
    try {
      // Find the document request by payment reference
      const { data: docRequest, error: fetchError } = await supabase
        .from('paid_document_requests')
        .select('*')
        .eq('payment_reference', paymentReference)
        .single();

      if (fetchError || !docRequest) {
        logger.error('Document request not found for payment', { paymentReference });
        return { success: false, error: 'Document request not found' };
      }

      // Update payment status
      const { data, error } = await supabase
        .from('paid_document_requests')
        .update({
          payment_status: 'success' as PaymentStatus,
          generation_status: 'queued' as GenerationStatus,
        })
        .eq('id', docRequest.id)
        .select()
        .single();

      if (error) {
        logger.error('Failed to confirm payment', error);
        return { success: false, error: error.message };
      }

      // Log payment success
      await this.addGenerationLog(docRequest.id, 'success', 'Payment confirmed successfully', {
        paymentReference,
      });

      // Trigger document generation
      await this.triggerGeneration(docRequest.id);

      return { success: true, data: data as PaidDocumentRequest };
    } catch (error: any) {
      logger.error('Error confirming payment', error);
      return { success: false, error: error.message || 'Payment confirmation failed' };
    }
  }

  /**
   * Trigger document generation (Step 3)
   */
  async triggerGeneration(documentRequestId: string): Promise<DocumentRequestResponse> {
    try {
      // Update status to processing
      await supabase
        .from('paid_document_requests')
        .update({ generation_status: 'processing' as GenerationStatus })
        .eq('id', documentRequestId);

      await this.addGenerationLog(documentRequestId, 'info', 'Starting document generation');

      // Call the document generation edge function
      const { data: generationResponse, error: generationError } = await supabase.functions.invoke(
        'generate-document',
        {
          body: {
            documentRequestId,
          },
        }
      );

      if (generationError) {
        await this.handleGenerationError(documentRequestId, generationError.message);
        return { success: false, error: 'Document generation failed' };
      }

      // Update with output files
      if (generationResponse?.outputFiles) {
        const { data, error } = await supabase
          .from('paid_document_requests')
          .update({
            generation_status: 'completed' as GenerationStatus,
            output_files: generationResponse.outputFiles as DocumentOutputFiles,
            receipt_url: generationResponse.receiptUrl,
          })
          .eq('id', documentRequestId)
          .select()
          .single();

        if (error) {
          logger.error('Failed to update generation results', error);
          return { success: false, error: error.message };
        }

        await this.addGenerationLog(documentRequestId, 'success', 'Document generated successfully');

        return { success: true, data: data as PaidDocumentRequest };
      }

      return { success: false, error: 'No output files generated' };
    } catch (error: any) {
      await this.handleGenerationError(documentRequestId, error.message);
      return { success: false, error: error.message || 'Document generation failed' };
    }
  }

  /**
   * Get signed download URL for a document
   */
  async getSignedDownloadUrl(
    documentRequestId: string,
    fileType: 'pdf' | 'docx' | 'pptx'
  ): Promise<{ success: boolean; url?: string; expiresAt?: string; error?: string }> {
    try {
      // Get the document request
      const { data: docRequest, error: fetchError } = await supabase
        .from('paid_document_requests')
        .select('*')
        .eq('id', documentRequestId)
        .single();

      if (fetchError || !docRequest) {
        return { success: false, error: 'Document not found' };
      }

      // Check if payment was successful
      if (docRequest.payment_status !== 'success') {
        return { success: false, error: 'Payment required to download document' };
      }

      // Check if generation is complete
      if (docRequest.generation_status !== 'completed') {
        return { success: false, error: 'Document generation not complete' };
      }

      const outputFiles = docRequest.output_files as DocumentOutputFiles;
      const fileUrl = outputFiles?.[`${fileType}_url`];

      if (!fileUrl) {
        return { success: false, error: `${fileType.toUpperCase()} file not available` };
      }

      // Generate signed URL (expires in 30 minutes)
      const expiresIn = 30 * 60; // 30 minutes in seconds
      const { data: signedUrl, error: signError } = await supabase.storage
        .from('documents')
        .createSignedUrl(fileUrl, expiresIn);

      if (signError) {
        logger.error('Failed to create signed URL', signError);
        return { success: false, error: 'Failed to generate download link' };
      }

      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      return {
        success: true,
        url: signedUrl.signedUrl,
        expiresAt,
      };
    } catch (error: any) {
      logger.error('Error getting signed URL', error);
      return { success: false, error: error.message || 'Failed to get download link' };
    }
  }

  /**
   * Add a generation log entry
   */
  private async addGenerationLog(
    documentRequestId: string,
    logType: 'info' | 'warning' | 'error' | 'success',
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await supabase.from('document_generation_logs').insert({
        document_request_id: documentRequestId,
        log_type: logType,
        message,
        metadata: metadata || {},
      });
    } catch (error) {
      logger.error('Failed to add generation log', error);
    }
  }

  /**
   * Handle generation error
   */
  private async handleGenerationError(documentRequestId: string, errorMessage: string): Promise<void> {
    try {
      await supabase
        .from('paid_document_requests')
        .update({ generation_status: 'failed' as GenerationStatus })
        .eq('id', documentRequestId);

      await this.addGenerationLog(documentRequestId, 'error', errorMessage);
    } catch (error) {
      logger.error('Failed to handle generation error', error);
    }
  }

  /**
   * Check if user has a pending document of the same type
   */
  async hasPendingDocument(userId: string, documentType: DocumentType): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('paid_document_requests')
        .select('id')
        .eq('user_id', userId)
        .eq('document_type', documentType)
        .eq('payment_status', 'pending')
        .limit(1);

      if (error) {
        return false;
      }

      return (data?.length ?? 0) > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get generation status updates
   */
  async getGenerationStatus(documentRequestId: string): Promise<{
    status: GenerationStatus;
    logs: Array<{ message: string; created_at: string; log_type: string }>;
  } | null> {
    try {
      // Get the document request
      const { data: docRequest, error: fetchError } = await supabase
        .from('paid_document_requests')
        .select('generation_status')
        .eq('id', documentRequestId)
        .single();

      if (fetchError || !docRequest) {
        return null;
      }

      // Get the logs
      const { data: logs, error: logsError } = await supabase
        .from('document_generation_logs')
        .select('message, created_at, log_type')
        .eq('document_request_id', documentRequestId)
        .order('created_at', { ascending: true });

      return {
        status: docRequest.generation_status as GenerationStatus,
        logs: logsError ? [] : (logs || []),
      };
    } catch {
      return null;
    }
  }
}

// Create singleton instance
export const documentGeneratorService = new DocumentGeneratorService();
