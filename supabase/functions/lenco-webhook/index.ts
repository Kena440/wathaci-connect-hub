import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleLencoWebhookRequest } from '../_shared/lenco-webhook-handler.ts';

type WaitUntil = (promise: Promise<unknown>) => void;

serve(async (req) => {
  const fallbackPromises: Promise<unknown>[] = [];
  const waitUntil = resolveWaitUntil(fallbackPromises);

  const response = await handleLencoWebhookRequest(req, waitUntil);

  if (fallbackPromises.length > 0) {
    await Promise.allSettled(fallbackPromises);
  }

  return response;
});

function resolveWaitUntil(pending: Promise<unknown>[]): WaitUntil {
  const edgeRuntime = (globalThis as { EdgeRuntime?: { waitUntil?: WaitUntil } }).EdgeRuntime;
  if (edgeRuntime?.waitUntil) {
    return edgeRuntime.waitUntil.bind(edgeRuntime);
  }

  return (promise: Promise<unknown>) => {
    pending.push(promise);
  };
}

export const config = {
  verifyJWT: false,
};
