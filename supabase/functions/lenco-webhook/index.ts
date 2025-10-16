import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleLencoWebhookRequest } from '../_shared/lenco-webhook-handler.ts';

serve(handleLencoWebhookRequest);
