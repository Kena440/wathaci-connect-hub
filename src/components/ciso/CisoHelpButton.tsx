import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

type CisoHelpButtonProps = {
  onClick: () => void;
};

export function CisoHelpButton({ onClick }: CisoHelpButtonProps) {
  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Button
        variant="default"
        className="flex items-center gap-2 shadow-lg"
        onClick={onClick}
      >
        <MessageCircle className="w-4 h-4" />
        <span>@Ask Ciso for Help</span>
      </Button>
    </div>
  );
}
