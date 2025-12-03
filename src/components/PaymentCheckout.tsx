import React, { useMemo, useState } from "react";
import { callCisoAgent, type CisoMessage } from "@/lib/cisoClient";

export type PlanConfig = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  billingCycle: "monthly" | "annual" | "once";
  description: string;
};

const PLAN_OPTIONS: PlanConfig[] = [
  {
    id: "starter-sme",
    name: "Starter SME",
    amount: 150,
    currency: "USD",
    billingCycle: "monthly",
    description: "For SMEs starting out with onboarding and marketplace visibility.",
  },
  {
    id: "growth-sme",
    name: "Growth SME",
    amount: 420,
    currency: "USD",
    billingCycle: "annual",
    description: "Includes investor matching support and compliance reminders.",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    amount: 750,
    currency: "USD",
    billingCycle: "annual",
    description: "For larger teams that need coordination and admin-level reporting.",
  },
];

type PaymentGateway = "Lenco" | "Card";

export const PaymentCheckout: React.FC = () => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(PLAN_OPTIONS[0]?.id);
  const [customerEmail, setCustomerEmail] = useState("");
  const [gateway, setGateway] = useState<PaymentGateway>("Lenco");
  const [isTrial, setIsTrial] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [lastPaymentError, setLastPaymentError] = useState<string | null>(null);

  const [cisoQuestion, setCisoQuestion] = useState("");
  const [cisoAnswer, setCisoAnswer] = useState<string | null>(null);
  const [isCisoLoading, setIsCisoLoading] = useState(false);

  const selectedPlan = useMemo(
    () => PLAN_OPTIONS.find((plan) => plan.id === selectedPlanId) ?? PLAN_OPTIONS[0],
    [selectedPlanId],
  );

  const handlePayNow = async () => {
    setIsPaying(true);
    setPaymentSuccess(false);
    setLastPaymentError(null);

    try {
      console.log("Initiating checkout", {
        selectedPlan,
        customerEmail,
        gateway,
        isTrial,
      });

      await new Promise((resolve) => setTimeout(resolve, 800));

      if (!customerEmail.trim()) {
        throw new Error("MISSING_CUSTOMER_EMAIL");
      }

      setPaymentSuccess(true);
    } catch (error) {
      const code =
        error instanceof Error && error.message
          ? error.message
          : "PAYMENT_FAILED";
      setLastPaymentError(code);
    } finally {
      setIsPaying(false);
    }
  };

  const handleAskCiso = async () => {
    if (!cisoQuestion.trim()) return;

    setIsCisoLoading(true);
    setCisoAnswer(null);

    const contextPayload = {
      userRole: "SME",
      flow: "checkout",
      step: "plan-selection-and-payment",
      plan: {
        id: selectedPlan.id,
        name: selectedPlan.name,
        amount: selectedPlan.amount,
        currency: selectedPlan.currency,
        billingCycle: selectedPlan.billingCycle,
      },
      payment: {
        gateway,
        isTrial,
        customerEmail: customerEmail || null,
      },
      lastPaymentError,
    };

    const contextText = [
      "CONTEXT (JSON):",
      JSON.stringify(contextPayload, null, 2),
      "",
      "QUESTION:",
      cisoQuestion.trim(),
    ].join("\n");

    const messages: CisoMessage[] = [
      { role: "user", content: contextText },
    ];

    try {
      const reply = await callCisoAgent(messages, "user");
      setCisoAnswer(reply);
    } catch (error) {
      console.error("[checkout] Failed to reach Ciso", error);
      setCisoAnswer(
        "I ran into a problem replying. Please try again or email support@wathaci.com.",
      );
    } finally {
      setIsCisoLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-emerald-700">Checkout</p>
              <h2 className="text-xl font-bold text-gray-900">Confirm your plan</h2>
            </div>
            {paymentSuccess ? (
              <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                Payment confirmed
              </span>
            ) : null}
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            {PLAN_OPTIONS.map((plan) => {
              const isSelected = selectedPlan.id === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`text-left border rounded-lg p-3 transition focus:outline-none ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 bg-white hover:border-emerald-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
                    <span className="text-xs uppercase text-gray-500">{plan.billingCycle}</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {plan.currency} {plan.amount}
                    <span className="text-xs text-gray-500 font-medium"> / {plan.billingCycle}</span>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{plan.description}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Billing email</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="you@business.com"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Gateway</label>
              <div className="flex gap-2">
                {(["Lenco", "Card"] as PaymentGateway[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setGateway(option)}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
                      gateway === option
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-gray-200 bg-white text-gray-700 hover:border-emerald-200"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="trial-toggle"
                type="checkbox"
                checked={isTrial}
                onChange={(e) => setIsTrial(e.target.checked)}
                className="h-4 w-4 text-emerald-600 border-gray-300 rounded"
              />
              <label htmlFor="trial-toggle" className="text-sm text-gray-700">
                Start with a free trial (where available)
              </label>
            </div>
          </div>

          {lastPaymentError && (
            <p className="mt-3 text-xs text-red-600">
              Last payment error: {lastPaymentError}
            </p>
          )}

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={handlePayNow}
              disabled={isPaying}
              className="inline-flex items-center px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isPaying ? "Processing…" : "Pay now"}
            </button>
            <span className="text-xs text-gray-600">
              Secure checkout via {gateway === "Lenco" ? "Lenco" : "card"} payments.
            </span>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">
              C
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-900">@Ask Ciso for help with this payment</p>
              <p className="text-xs text-emerald-700">
                Share concerns about your plan, payment method, or any error code you are seeing.
              </p>
            </div>
          </div>

          <textarea
            rows={3}
            value={cisoQuestion}
            onChange={(e) => setCisoQuestion(e.target.value)}
            placeholder="Example: I selected Lenco but I’m not sure if USD is supported for my country."
            className="w-full text-sm border border-emerald-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAskCiso}
              disabled={isCisoLoading || !cisoQuestion.trim()}
              className="px-4 py-2 text-sm font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isCisoLoading ? "Ciso is thinking…" : "Ask Ciso about this payment"}
            </button>
          </div>

          {cisoAnswer && (
            <div className="bg-white border border-emerald-100 rounded-md p-3 text-sm text-gray-800">
              {cisoAnswer}
            </div>
          )}
        </div>
      </div>

      <aside className="space-y-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Order summary</h3>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">Plan</span>
            <span className="font-medium text-gray-900">{selectedPlan.name}</span>
          </div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">Billing</span>
            <span className="font-medium text-gray-900 capitalize">{selectedPlan.billingCycle}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Total due</span>
            <span className="text-lg font-bold text-gray-900">
              {selectedPlan.currency} {selectedPlan.amount}
            </span>
          </div>
          {isTrial && (
            <p className="mt-2 text-xs text-emerald-700">Trial applied when available; charges start after the trial period.</p>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-sm text-gray-700 space-y-1">
          <p className="font-semibold text-gray-900">Need help?</p>
          <p>• Capture any error code before retrying.</p>
          <p>• Confirm mobile money/card limits and sufficient funds.</p>
          <p>• Email support@wathaci.com with screenshots if payments keep failing.</p>
        </div>
      </aside>
    </div>
  );
};

export default PaymentCheckout;
