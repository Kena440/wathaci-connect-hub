
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary.tsx";

const registerGlobalErrorHandlers = (() => {
  let registered = false;
  return () => {
    if (registered || typeof window === "undefined") {
      return;
    }

    window.addEventListener("error", (event) => {
      console.error("[bootstrap] Uncaught error", event.error ?? event.message);
    });

    window.addEventListener("unhandledrejection", (event) => {
      console.error("[bootstrap] Unhandled rejection", event.reason);
    });

    registered = true;
  };
})();

const rootElement = document.getElementById("root");

if (!rootElement) {
  const message = "Root element with id \"root\" was not found. Unable to mount the React application.";
  console.error(`[bootstrap] ${message}`);
  throw new Error(message);
}

registerGlobalErrorHandlers();

console.info("[bootstrap] Hydrating React application", {
  mode: import.meta.env.MODE,
  timestamp: new Date().toISOString(),
});

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
