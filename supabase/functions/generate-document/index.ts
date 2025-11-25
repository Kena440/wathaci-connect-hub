import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

interface GenerateDocumentRequest {
  documentRequestId: string;
}

interface DocumentOutputFiles {
  pdf_url?: string;
  docx_url?: string;
  pptx_url?: string;
  expires_at?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Verify JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify authentication
    const userClient = createClient(supabaseUrl, supabaseAnonKey || supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body: GenerateDocumentRequest = await req.json();
    const { documentRequestId } = body;

    if (!documentRequestId) {
      return new Response(
        JSON.stringify({ success: false, error: 'documentRequestId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the document request
    const { data: docRequest, error: fetchError } = await supabase
      .from('paid_document_requests')
      .select('*')
      .eq('id', documentRequestId)
      .single();

    if (fetchError || !docRequest) {
      console.error('Document request not found:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Document request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the document belongs to the authenticated user
    if (docRequest.user_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify payment status
    if (docRequest.payment_status !== 'success') {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment not confirmed' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already completed
    if (docRequest.generation_status === 'completed' && docRequest.output_files) {
      return new Response(
        JSON.stringify({
          success: true,
          outputFiles: docRequest.output_files,
          message: 'Document already generated',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to processing
    await supabase
      .from('paid_document_requests')
      .update({ generation_status: 'processing' })
      .eq('id', documentRequestId);

    // Add log entry
    await addGenerationLog(supabase, documentRequestId, 'info', 'Starting AI document generation');

    console.log(`[generate-document] Processing ${docRequest.document_type}`, {
      requestId: documentRequestId,
      userId: docRequest.user_id,
    });

    // Generate the document based on type
    const inputData = docRequest.input_data;
    const documentType = docRequest.document_type;

    // In production, this would call an AI service (e.g., OpenAI, Anthropic)
    // For now, we simulate the generation process
    await addGenerationLog(supabase, documentRequestId, 'info', 'Preparing document data');
    
    // Simulate AI processing time
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await addGenerationLog(supabase, documentRequestId, 'info', 'Running AI model');

    await new Promise((resolve) => setTimeout(resolve, 1500));
    await addGenerationLog(supabase, documentRequestId, 'info', 'Rendering document files');

    // Generate file paths
    const timestamp = Date.now();
    const basePath = `documents/${docRequest.user_id}/${documentRequestId}`;
    
    const outputFiles: DocumentOutputFiles = {
      pdf_url: `${basePath}/document_${timestamp}.pdf`,
      docx_url: `${basePath}/document_${timestamp}.docx`,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
    };

    // Add PPTX for pitch deck
    if (documentType === 'pitch_deck') {
      outputFiles.pptx_url = `${basePath}/document_${timestamp}.pptx`;
    }

    // TODO: Production implementation required
    // ======================================
    // In production, replace this placeholder with actual implementation:
    // 
    // 1. AI DOCUMENT GENERATION:
    //    - Call OpenAI/Anthropic API with inputData to generate document content
    //    - Use appropriate prompts for business_plan vs pitch_deck
    //
    // 2. FILE RENDERING:
    //    - Use libraries like docx/pptx-templater for document generation
    //    - Use puppeteer/jspdf for PDF rendering
    //
    // 3. STORAGE UPLOAD:
    //    - Upload generated files to Supabase Storage bucket
    //    - Store actual file paths (not placeholders)
    //
    // 4. RECEIPT GENERATION:
    //    - Generate payment receipt PDF with transaction details
    // ======================================

    // PLACEHOLDER: Simulate processing delay (remove in production)
    await new Promise((resolve) => setTimeout(resolve, 500));
    await addGenerationLog(supabase, documentRequestId, 'info', 'Finalizing document');

    // Generate receipt URL
    const receiptUrl = `${basePath}/receipt_${timestamp}.pdf`;

    // Update document request with output files
    const { error: updateError } = await supabase
      .from('paid_document_requests')
      .update({
        generation_status: 'completed',
        output_files: outputFiles,
        receipt_url: receiptUrl,
      })
      .eq('id', documentRequestId);

    if (updateError) {
      console.error('Failed to update document request:', updateError);
      await addGenerationLog(supabase, documentRequestId, 'error', 'Failed to save document');
      throw new Error('Failed to save generated document');
    }

    await addGenerationLog(supabase, documentRequestId, 'success', 'Document generated successfully');

    console.log(`[generate-document] Completed ${documentType}`, {
      requestId: documentRequestId,
      outputFiles,
    });

    return new Response(
      JSON.stringify({
        success: true,
        outputFiles,
        receiptUrl,
        message: 'Document generated successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Document generation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Document generation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function addGenerationLog(
  supabase: ReturnType<typeof createClient>,
  documentRequestId: string,
  logType: 'info' | 'warning' | 'error' | 'success',
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('document_generation_logs').insert({
      document_request_id: documentRequestId,
      log_type: logType,
      message,
      metadata: metadata || {},
    });
  } catch (error) {
    console.error('Failed to add generation log:', error);
  }
}
