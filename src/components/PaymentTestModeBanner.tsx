const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

export function PaymentTestModeBanner() {
  if (!clientToken?.startsWith("test_")) return null;

  return (
    <div className="w-full bg-orange-100 border-b border-orange-300 px-4 py-2 text-center text-sm text-orange-800">
      Payments are in test mode.{" "}
      <a
        href="https://docs.lovable.dev/integrations/paddle#test-vs-live"
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-medium"
      >
        Read more
      </a>
    </div>
  );
}
