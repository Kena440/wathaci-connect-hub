import React from "react";
import PaymentCheckout from "@/components/PaymentCheckout";

const PaymentPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <div>
          <p className="text-sm font-semibold text-emerald-700">WATHACI Connect</p>
          <h1 className="text-2xl font-bold text-gray-900">Complete your subscription</h1>
          <p className="text-sm text-gray-700">
            Select a plan, confirm your preferred gateway, and ask Ciso if you need help before paying.
          </p>
        </div>
        <PaymentCheckout />
      </div>
    </div>
  );
};

export default PaymentPage;
