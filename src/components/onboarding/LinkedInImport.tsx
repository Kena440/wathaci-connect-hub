import { useState } from 'react';
import { Linkedin, Sparkles, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LinkedInImportResult {
  linkedin_url: string | null;
  base: Record<string, unknown>;
  role: Record<string, unknown>;
  notes?: string | null;
}

interface LinkedInImportProps {
  accountType: string | null;
  defaultUrl?: string | null;
  onImported: (result: LinkedInImportResult) => void;
}

const LINKEDIN_URL_RE = /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/(in|company|school)\/[^\s?#]+/i;

export function LinkedInImport({ accountType, defaultUrl, onImported }: LinkedInImportProps) {
  const [url, setUrl] = useState(defaultUrl || '');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    const trimmedUrl = url.trim();
    if (trimmedUrl && !LINKEDIN_URL_RE.test(trimmedUrl)) {
      toast.error('That does not look like a LinkedIn profile URL.');
      return;
    }
    if (text.trim().length < 60) {
      toast.error('Paste a bit more of your LinkedIn profile (headline, About, experience).');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-profile-import', {
        body: {
          linkedin_url: trimmedUrl,
          pasted_text: text.trim(),
          account_type: accountType || 'freelancer',
        },
      });

      if (error) {
        const details = 'context' in error && error.context
          ? await (error.context as Response).text().catch(() => '')
          : '';
        let message = error.message;
        try {
          const parsed = JSON.parse(details);
          if (parsed?.error) message = parsed.error;
        } catch { /* keep default message */ }
        throw new Error(message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Could not build your profile from that text.');
      }

      onImported({
        linkedin_url: data.linkedin_url ?? (trimmedUrl || null),
        base: data.base || {},
        role: data.role || {},
        notes: data.notes,
      });
      toast.success('Profile fields filled in from LinkedIn — review and edit before continuing.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Linkedin className="h-4 w-4 text-primary" />
          Build my profile from LinkedIn
        </CardTitle>
        <CardDescription>
          Optional shortcut. Add your LinkedIn URL and paste your profile text — we&apos;ll fill in the form for you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="linkedin-import-url">LinkedIn URL</Label>
          <Input
            id="linkedin-import-url"
            placeholder="https://linkedin.com/in/yourprofile"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="linkedin-import-text">Paste your LinkedIn profile text</Label>
          <Textarea
            id="linkedin-import-text"
            placeholder="Open your LinkedIn profile, select your headline, About section and recent experience, then paste it here..."
            className="min-h-[140px] resize-y"
            maxLength={12000}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <Alert className="border-primary/20 bg-background">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            LinkedIn blocks automated reading of profile pages, so we can&apos;t fetch it from the URL alone. Pasting the text keeps everything accurate and under your control — nothing is saved until you finish the wizard.
          </AlertDescription>
        </Alert>

        <Button type="button" onClick={handleImport} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Building your profile...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Build my profile
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
