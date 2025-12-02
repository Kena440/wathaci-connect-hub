import { useEffect, useMemo, useRef, useState } from 'react';
import { Send, MessageCircle, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { submitCisoQuestion } from '@/lib/api/support';

export const AskCisoFloatingWidget = () => {
  const { toast } = useToast();
  const { user, profile } = useAppContext();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  const replyToEmail = useMemo(() => {
    const userEmail = user?.email?.trim();
    const profileEmail = typeof profile?.email === 'string' ? profile.email.trim() : '';

    return userEmail || profileEmail || null;
  }, [profile?.email, user?.email]);

  useEffect(() => {
    if (!open || !textareaRef.current) return;

    const textarea = textareaRef.current;
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        toggleRef.current &&
        !toggleRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleSubmit = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      toast({
        title: 'Add a question for Ciso',
        description: 'Describe your issue so Ciso can help.',
        variant: 'destructive',
      });
      return;
    }

    if (!replyToEmail) {
      toast({
        title: 'Add a contact email',
        description: 'Sign in or update your profile so Ciso can reply directly.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await submitCisoQuestion({
        email: replyToEmail,
        message: trimmedMessage,
        subject: '@Ask Ciso for help',
        category: 'ciso',
        userId: user?.id ?? undefined,
      });

      toast({
        title: 'Question sent to Ciso',
        description:
          response.message ?? "Your question has been sent. You'll get a response shortly.",
      });

      setMessage('');
      setOpen(false);
    } catch (error) {
      const description =
        error instanceof Error ? error.message : 'Unable to send your question right now.';

      toast({
        title: 'Could not send your question',
        description,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {open && (
        <div
          ref={panelRef}
          id="ask-ciso-panel"
          role="dialog"
          aria-modal="true"
          aria-label="@Ask Ciso for help"
          className="fixed bottom-24 right-4 left-4 sm:left-auto sm:right-4 z-50 w-auto max-w-full sm:w-[380px] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur"
        >
          <div className="flex items-start justify-between px-4 py-3 bg-emerald-600 text-white">
            <div className="flex flex-col">
              <span className="font-semibold">@Ask Ciso for help</span>
              <span className="text-xs text-white/80">Tell Ciso what you need help with.</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close Ciso support window"
              className="ml-3 rounded-full p-1 text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-600"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto p-4 sm:max-h-[360px]">
            <label className="sr-only" htmlFor="ask-ciso-question">
              Describe your issue or question for Ciso
            </label>
            <Textarea
              id="ask-ciso-question"
              ref={textareaRef}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Describe your issue or question for Ciso..."
              className="min-h-[160px] resize-none border-slate-200 focus-visible:ring-emerald-500"
            />
            <p className="text-xs text-slate-600">
              Ciso will review and respond as soon as possible.
            </p>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                {submitting ? 'Sending...' : 'Send to Ciso'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls="ask-ciso-panel"
        onClick={() => setOpen((previous) => !previous)}
        className="fixed bottom-4 right-4 sm:right-6 z-40 flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-xl transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        aria-label="@Ask Ciso for help"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg font-semibold">
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="hidden sm:inline">@Ask Ciso for help</span>
      </button>
    </>
  );
};

export default AskCisoFloatingWidget;
