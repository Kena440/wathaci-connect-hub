import { useEffect, useMemo } from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AppProvider } from "@/contexts/AppContext";
import { ConfigurationError } from "@/components/ConfigurationError";
import { RouteChangeDebugger } from "@/components/RouteChangeDebugger";
import { supabaseConfigStatus } from "@/config/appConfig";
import { getPaymentConfig } from "@/lib/payment-config";
import CisoWidget from "@/components/CisoWidget";
import AppRoutes from "./AppRoutes";
import "./i18n";
const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="light">
    <InnerApp />
  </ThemeProvider>
);

const InnerApp = () => {
  const paymentConfigSnapshot = useMemo(() => {
    const config = getPaymentConfig();
    const fatalIssues: string[] = [];
    const warnings: string[] = [];

    const isRuntimeProd = import.meta.env.PROD || config.environment === "production";

    if (!config.sources?.publicKey) {
      const message = "Lenco public key is not configured. Set VITE_LENCO_PUBLIC_KEY (alias: LENCO_PUBLIC_KEY).";
      if (isRuntimeProd) {
        fatalIssues.push(message);
      } else {
        warnings.push(message);
      }
    }

    if (!config.sources?.apiUrl) {
      const message = "Lenco API URL is not configured. Set VITE_LENCO_API_URL (alias: LENCO_API_URL).";
      if (isRuntimeProd) {
        fatalIssues.push(message);
      } else {
        warnings.push(message);
      }
    }

    if (config.environment === "production" && config.publicKey.startsWith("pk_test_")) {
      fatalIssues.push("Production environment is configured with a test Lenco public key (pk_test_...).");
    }

    if (!config.sources?.webhookUrl) {
      const message = "Lenco webhook URL is not configured. Set VITE_LENCO_WEBHOOK_URL (alias: LENCO_WEBHOOK_URL).";
      if (isRuntimeProd) {
        fatalIssues.push(message);
      } else {
        warnings.push(message);
      }
    } else if (!/^https:\/\//i.test(config.webhookUrl)) {
      warnings.push("Lenco webhook URL must be HTTPS.");
    }

    return { config, fatalIssues, warnings } as const;
  }, []);

  const chatbaseBotId =
    import.meta.env.NEXT_PUBLIC_CHATBOT_ID ??
    import.meta.env.VITE_NEXT_PUBLIC_CHATBOT_ID ??
    import.meta.env.VITE_CHATBOT_ID ??
    "";

  const chatbaseSnippet = useMemo(
    () =>
      `(function(){if(!window.chatbase||window.chatbase("getState")!=="initialized"){window.chatbase=(...arguments)=>{if(!window.chatbase.q){window.chatbase.q=[]}window.chatbase.q.push(arguments)};window.chatbase=new Proxy(window.chatbase,{get(target,prop){if(prop==="q"){return target.q}return(...args)=>target(prop,...args)}})}const onLoad=function(){const script=document.createElement("script");script.src="www.chatbase.co/embed.min.js";script.id="${chatbaseBotId}";script.domain="www.chatbase.co";document.body.appendChild(script)};if(document.readyState==="complete"){onLoad()}else{window.addEventListener("load",onLoad)}})();`,
    [chatbaseBotId],
  );

  useEffect(() => {
    console.info("[app] Mounted", {
      mode: import.meta.env.MODE,
      supabaseConfigured: supabaseConfigStatus.hasValidConfig,
      paymentPublicKeyConfigured: Boolean(paymentConfigSnapshot.config.sources?.publicKey),
      paymentWebhookConfigured: Boolean(paymentConfigSnapshot.config.sources?.webhookUrl),
    });

    return () => {
      console.info("[app] Unmounted");
    };
  }, [paymentConfigSnapshot]);

  const isRuntimeProd =
    import.meta.env.PROD || paymentConfigSnapshot.config.environment === "production";

  const shouldBlockRender =
    (isRuntimeProd && !supabaseConfigStatus.hasValidConfig) ||
    paymentConfigSnapshot.fatalIssues.length > 0;

  if (!shouldBlockRender && !supabaseConfigStatus.hasValidConfig) {
    console.warn(
      "[app] Supabase configuration missing. Using mock client so the UI can continue rendering.",
      {
        missingUrlKeys: supabaseConfigStatus.missingUrlKeys,
        missingAnonKeys: supabaseConfigStatus.missingAnonKeys,
      },
    );
  }

  if (shouldBlockRender) {
    return (
      <ConfigurationError
        supabaseStatus={supabaseConfigStatus}
        paymentStatus={paymentConfigSnapshot}
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            {import.meta.env.DEV ? <RouteChangeDebugger /> : null}
            <AppRoutes />
          </BrowserRouter>
          <CisoWidget />
          <script dangerouslySetInnerHTML={{ __html: chatbaseSnippet }} />
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
