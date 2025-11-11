import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface ConfigurationWarningBannerProps {
  warnings: string[];
}

export const ConfigurationWarningBanner = ({ warnings }: ConfigurationWarningBannerProps) => {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4">
      <Alert variant="warning" className="max-w-4xl mx-auto">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Configuration Warnings</AlertTitle>
        <AlertDescription>
          <ul className="mt-2 space-y-1 text-sm">
            {warnings.map((warning, index) => (
              <li key={`warning-${index}`}>{warning}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs">
            These warnings won't prevent the app from running, but you should address them before going to production.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ConfigurationWarningBanner;
