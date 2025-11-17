import React from "react";
import { SignupFlow } from "@/components/auth/SignupFlow";

const WathaciSignupPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <SignupFlow />
    </div>
  );
};

export default WathaciSignupPage;
