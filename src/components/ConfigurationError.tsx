import type { SupabaseConfigStatus } from "@/config/appConfig";
import type { PaymentConfig } from "@/lib/payment-config";

interface ConfigurationErrorProps {
  supabaseStatus: SupabaseConfigStatus;
  paymentStatus: {
    config: PaymentConfig;
    fatalIssues: string[];
    warnings: string[];
  };
}

const listToSentence = (values: string[]) =>
  values
    .filter(Boolean)
    .map((value) => value.trim())
    .filter((value, index, array) => value && array.indexOf(value) === index);

export const ConfigurationError = ({ supabaseStatus, paymentStatus }: ConfigurationErrorProps) => {
  const supabaseIssues: string[] = [];

  if (!supabaseStatus.hasValidConfig) {
    const missingSections: string[] = [];

    if (supabaseStatus.missingUrlKeys.length > 0) {
      const aliases = supabaseStatus.aliasUrlKeys.length > 0 ? ` (aliases checked: ${supabaseStatus.aliasUrlKeys.join(", ")})` : "";
      missingSections.push(`Supabase URL → set ${supabaseStatus.canonicalUrlKey}${aliases}`);
    }

    if (supabaseStatus.missingAnonKeys.length > 0) {
      const aliases =
        supabaseStatus.aliasAnonKeys.length > 0 ? ` (aliases checked: ${supabaseStatus.aliasAnonKeys.join(", ")})` : "";
      missingSections.push(`Supabase anon/public key → set ${supabaseStatus.canonicalAnonKey}${aliases}`);
    }

    if (missingSections.length > 0) {
      supabaseIssues.push(`Missing ${missingSections.join(" and ")}.`);
    }

    if (supabaseStatus.errorMessage) {
      supabaseIssues.push(supabaseStatus.errorMessage);
    }
  }

  const paymentIssues = listToSentence(paymentStatus.fatalIssues);
  const warnings = listToSentence(paymentStatus.warnings);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-orange-50 px-6 py-12 text-center">
      <div className="w-full max-w-3xl space-y-6 rounded-2xl bg-white p-8 shadow-xl ring-1 ring-orange-200/60">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Configuration required before launch</h1>
          <p className="text-sm text-gray-600">
            We detected missing environment configuration. The UI is paused to prevent blank screens in production. Update the
            values below and redeploy.
          </p>
        </header>

        {(supabaseIssues.length > 0 || paymentIssues.length > 0) && (
          <section className="space-y-3 text-left">
            <h2 className="text-lg font-semibold text-gray-900">Blocking issues</h2>
            <ul className="space-y-2 text-sm text-red-700">
              {supabaseIssues.map((issue, index) => (
                <li key={`supabase-issue-${index}`} className="rounded-md bg-red-50 p-3">
                  {issue}
                </li>
              ))}
              {paymentIssues.map((issue, index) => (
                <li key={`payment-issue-${index}`} className="rounded-md bg-red-50 p-3">
                  {issue}
                </li>
              ))}
            </ul>
          </section>
        )}

        {warnings.length > 0 && (
          <section className="space-y-3 text-left">
            <h2 className="text-lg font-semibold text-gray-900">Warnings</h2>
            <ul className="space-y-2 text-sm text-amber-700">
              {warnings.map((warning, index) => (
                <li key={`warning-${index}`} className="rounded-md bg-amber-50 p-3">
                  {warning}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-3 text-left">
          <h2 className="text-lg font-semibold text-gray-900">How to fix</h2>
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="rounded-md bg-gray-50 p-3">
              Update your <code>.env.production</code> (or the environment variables in your hosting provider) with the required
              Supabase and Lenco keys. For example:
              <pre className="mt-2 overflow-x-auto rounded bg-black/90 p-3 text-xs text-white">
{`VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="<public-anon-key>"
VITE_LENCO_PUBLIC_KEY="<pk_live_...>"
VITE_LENCO_API_URL="https://api.lenco.co/access/v2"`}
              </pre>
            </li>
            <li className="rounded-md bg-gray-50 p-3">
              Rebuild and redeploy after updating the variables:
              <pre className="mt-2 overflow-x-auto rounded bg-black/90 p-3 text-xs text-white">
{`npm run build
npm run preview`}
              </pre>
            </li>
            <li className="rounded-md bg-gray-50 p-3">
              Refresh this page once the deployment completes. The application will resume automatically when the configuration
              is valid.
            </li>
          </ol>
        </section>

        <footer className="text-xs text-gray-500">
          Need help? Email <a className="text-blue-600 underline" href="mailto:support@wathaci.com">support@wathaci.com</a> or
          check the deployment runbook.
        </footer>
      </div>
    </div>
  );
};

export default ConfigurationError;
