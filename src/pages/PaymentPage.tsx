import React from "react";
import PaymentCheckout from "../components/PaymentCheckout";

const PaymentPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Optional: your nav/header */}
      <PaymentCheckout />
    </div>
  );
};

export default PaymentPage;
