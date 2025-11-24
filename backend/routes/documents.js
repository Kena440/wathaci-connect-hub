/**
 * Document Generator Routes
 * API endpoints for AI document generation with payment
 */

const express = require('express');
const crypto = require('node:crypto');

const router = express.Router();

// In-memory store for document requests (in production, use database)
const documentRequests = new Map();
const DOCUMENT_PRICE = 150; // ZMW

/**
 * POST /api/documents/pay
 * Initialize payment for document generation
 */
router.post('/pay', async (req, res) => {
  try {
    const { document_type, payment_method, user_id, company_id, phone_number, provider } = req.body;

    // Validation
    if (!document_type || !['business_plan', 'pitch_deck'].includes(document_type)) {
      return res.status(400).json({ error: 'Invalid document_type. Must be business_plan or pitch_deck' });
    }

    if (!payment_method || !['mobile_money', 'card'].includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment_method. Must be mobile_money or card' });
    }

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    if (!company_id) {
      return res.status(400).json({ error: 'company_id is required' });
    }

    if (payment_method === 'mobile_money') {
      if (!phone_number) {
        return res.status(400).json({ error: 'phone_number is required for mobile money' });
      }
      if (!provider || !['mtn', 'airtel', 'zamtel'].includes(provider)) {
        return res.status(400).json({ error: 'Invalid provider. Must be mtn, airtel, or zamtel' });
      }
    }

    // Generate payment reference
    const paymentReference = `DOC_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Store request
    const requestData = {
      id: crypto.randomUUID(),
      user_id,
      company_id,
      document_type,
      payment_method,
      phone_number,
      provider,
      amount: DOCUMENT_PRICE,
      currency: 'ZMW',
      payment_reference: paymentReference,
      payment_status: 'pending',
      generation_status: 'not_started',
      created_at: new Date().toISOString(),
      ip_address: req.ip || req.connection?.remoteAddress,
    };

    documentRequests.set(paymentReference, requestData);

    console.log(`[document-pay] Payment initialized for ${document_type}`, {
      reference: paymentReference,
      user_id,
      payment_method,
    });

    // In production, this would integrate with actual payment gateway
    // For now, return the reference for webhook processing
    res.status(200).json({
      success: true,
      payment_reference: paymentReference,
      amount: DOCUMENT_PRICE,
      currency: 'ZMW',
      message: payment_method === 'mobile_money'
        ? `Payment request sent to your ${provider?.toUpperCase()} phone`
        : 'Redirect to card payment page',
    });

  } catch (error) {
    console.error('[document-pay] Error:', error);
    res.status(500).json({ error: 'Failed to initialize payment' });
  }
});

/**
 * POST /api/documents/webhook
 * Handle payment webhook callbacks
 */
router.post('/webhook', async (req, res) => {
  try {
    const { payment_reference, status, transaction_id, amount } = req.body;

    if (!payment_reference) {
      return res.status(400).json({ error: 'Missing payment_reference' });
    }

    const request = documentRequests.get(payment_reference);
    if (!request) {
      console.warn(`[document-webhook] Unknown payment reference: ${payment_reference}`);
      return res.status(404).json({ error: 'Payment reference not found' });
    }

    // Validate amount matches
    if (amount && amount !== request.amount) {
      console.warn(`[document-webhook] Amount mismatch for ${payment_reference}:`, {
        expected: request.amount,
        received: amount,
      });
      return res.status(400).json({ error: 'Amount mismatch' });
    }

    // Update payment status
    const paymentStatus = status === 'success' || status === 'completed' ? 'success' : 'failed';
    request.payment_status = paymentStatus;
    request.transaction_id = transaction_id;
    request.updated_at = new Date().toISOString();

    console.log(`[document-webhook] Payment ${paymentStatus} for ${payment_reference}`);

    if (paymentStatus === 'success') {
      // Queue document generation
      request.generation_status = 'queued';
      // In production, trigger the document generation process
      console.log(`[document-webhook] Document generation queued for ${payment_reference}`);
    }

    res.status(200).json({ received: true, status: paymentStatus });

  } catch (error) {
    console.error('[document-webhook] Error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * GET /api/documents/:id
 * Get document request status
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Search by ID or payment reference
    let request = null;
    for (const [, data] of documentRequests) {
      if (data.id === id || data.payment_reference === id) {
        request = data;
        break;
      }
    }

    if (!request) {
      return res.status(404).json({ error: 'Document request not found' });
    }

    res.status(200).json({
      success: true,
      data: request,
    });

  } catch (error) {
    console.error('[document-get] Error:', error);
    res.status(500).json({ error: 'Failed to get document' });
  }
});

/**
 * GET /api/documents/user/:userId
 * Get all documents for a user
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const userDocuments = [];
    for (const [, data] of documentRequests) {
      if (data.user_id === userId) {
        userDocuments.push(data);
      }
    }

    // Sort by created_at descending
    userDocuments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.status(200).json({
      success: true,
      data: userDocuments,
    });

  } catch (error) {
    console.error('[document-list] Error:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

/**
 * POST /api/documents/:id/generate
 * Trigger document generation (after payment confirmed)
 */
router.post('/:id/generate', async (req, res) => {
  try {
    const { id } = req.params;

    // Find request
    let request = null;
    for (const [, data] of documentRequests) {
      if (data.id === id || data.payment_reference === id) {
        request = data;
        break;
      }
    }

    if (!request) {
      return res.status(404).json({ error: 'Document request not found' });
    }

    if (request.payment_status !== 'success') {
      return res.status(403).json({ error: 'Payment not confirmed. Cannot generate document.' });
    }

    if (request.generation_status === 'completed') {
      return res.status(200).json({
        success: true,
        message: 'Document already generated',
        data: request,
      });
    }

    // Update status to processing
    request.generation_status = 'processing';
    request.updated_at = new Date().toISOString();

    console.log(`[document-generate] Starting generation for ${id}`);

    // In production, this would trigger the actual AI generation process
    // For demo, simulate generation with a delay
    setTimeout(() => {
      request.generation_status = 'completed';
      request.output_files = {
        pdf_url: `documents/${request.user_id}/${request.id}/document.pdf`,
        docx_url: `documents/${request.user_id}/${request.id}/document.docx`,
        pptx_url: request.document_type === 'pitch_deck'
          ? `documents/${request.user_id}/${request.id}/document.pptx`
          : undefined,
      };
      request.updated_at = new Date().toISOString();
      console.log(`[document-generate] Completed for ${id}`);
    }, 5000);

    res.status(200).json({
      success: true,
      message: 'Document generation started',
      generation_status: 'processing',
    });

  } catch (error) {
    console.error('[document-generate] Error:', error);
    res.status(500).json({ error: 'Failed to start generation' });
  }
});

module.exports = router;
