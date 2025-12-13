const { runDiagnosis } = require('../diagnostics-engine');
const { logRun } = require('../diagnostics-store');
const {
  createPaymentRequest,
  generateDocument,
  markPaymentStatus,
} = require('../document-request-service');
const SUPPORTED_ACTIONS = [
  'run_diagnostics',
  'generate_document',
  'pay_document',
  'generate_credit_passport',
  'share_credit_passport',
  'send_email',
  'send_otp',
  'contact_support',
  'request_upload',
];

const ensureOwnership = async (task, userId) => {
  if (!task || !task.session_owner) {
    throw new Error('Task ownership context missing');
  }
  if (task.session_owner !== userId) {
    const err = new Error('Unauthorized');
    err.status = 403;
    throw err;
  }
};

async function executeAction(task, userId) {
  await ensureOwnership(task, userId);
  const { action_key: actionKey, action_payload: payload = {} } = task;
  if (!SUPPORTED_ACTIONS.includes(actionKey)) {
    const error = new Error('Unsupported action');
    error.status = 400;
    throw error;
  }

  switch (actionKey) {
    case 'run_diagnostics': {
      const diagnosis = runDiagnosis({ companyId: payload.company_id || task.session_id, input: payload });
      logRun({ companyId: payload.company_id || task.session_id, inputHash: 'copilot', output: diagnosis });
      return { status: 'completed', diagnosis };
    }
    case 'generate_document': {
      const request = await createPaymentRequest({
        document_type: payload.document_type || 'business_plan',
        payment_method: payload.payment_method || 'manual',
        user_id: payload.user_id || userId,
        company_id: payload.company_id || userId,
        payment_status: 'success',
      });
      const generated = await generateDocument(request.id, payload.user_id || userId);
      return { status: generated.generation_status, request_id: request.id };
    }
    case 'pay_document': {
      if (!payload.request_id) throw new Error('request_id required');
      const updated = await markPaymentStatus(payload.request_id, payload.status || 'success', payload.meta || {});
      return { status: updated.payment_status, request_id: payload.request_id };
    }
    case 'request_upload':
      return { status: 'requested', note: 'User prompted to upload document' };
    default: {
      return { status: 'queued', note: `${actionKey} placeholder executed` };
    }
  }
}

module.exports = {
  executeAction,
  SUPPORTED_ACTIONS,
};
