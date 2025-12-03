import React, { useState } from "react";
import { callCisoAgent, type CisoMessage } from "../lib/cisoClient";

type BillingCycle = "monthly" | "annual";

interface Plan {
  id: string;
  name: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  description: string;
}

const PLANS: Plan[] = [
  {
    id: "sme-basic-monthly",
    name: "SME Basic",
    amount: 25,
    currency: "USD",
    billingCycle: "monthly",
    description: "Core features to get discovered and connect with partners.",
  },
  {
    id: "sme-growth-annual",
    name: "SME Growth",
    amount: 240,
    currency: "USD",
    billingCycle: "annual",
    description:
      "Advanced tools, priority visibility and matched intros across the year.",
  },
];

const PaymentCheckout: React.FC = () => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(PLANS[0].id);
  const [customerEmail, setCustomerEmail] = useState("");
  const [isTrial, setIsTrial] = useState(false);
  const [gateway] = useState<"Lenco" | "Card">("Lenco");

  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [lastPaymentError, setLastPaymentError] = useState<string | null>(null);

  // Inline Ciso helper state
  const [cisoQuestion, setCisoQuestion] = useState("");
  const [cisoAnswer, setCisoAnswer] = useState<string | null>(null);
  const [isCisoLoading, setIsCisoLoading] = useState(false);

  const selectedPlan = PLANS.find((p) => p.id === selectedPlanId)!;

  const handlePayNow = async () => {
    setIsPaying(true);
    setPaymentSuccess(false);
    setLastPaymentError(null);

    try {
      // TODO: replace this with your real payment initiation call
      // e.g. await createCheckoutSession({ planId: selectedPlan.id, gateway, email: customerEmail, ... })

      console.log("Starting payment with Lenco", {
        planId: selectedPlan.id,
        amount: selectedPlan.amount,
        currency: selectedPlan.currency,
        billingCycle: selectedPlan.billingCycle,
        gateway,
        customerEmail,
        isTrial,
      });

      // Simulate a payment error for testing Ciso:
      // throw new Error("LENCO_WEBHOOK_TIMEOUT");

      // Simulate success:
      setPaymentSuccess(true);
    } catch (err: any) {
      console.error(err);
      const code = err?.message || "UNKNOWN_ERROR";
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
        gateway, // e.g. "Lenco"
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
      {
        role: "user",
        content: contextText,
      },
    ];

    try {
      const reply = await callCisoAgent(messages, "user", {
        role: "SME",
        flow: "checkout",
        step: "plan-selection-and-payment",
        lastError: lastPaymentError,
      });
      setCisoAnswer(reply);
    } catch (err) {
      console.error(err);
      setCisoAnswer(
        "I ran into a problem trying to help with this payment right now. Please try again or email support@wathaci.com.",
      );
    } finally {
      setIsCisoLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Main checkout card */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 space-y-5">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Confirm your WATHACI subscription
            </h1>
            <p className="text-sm text-gray-600">
              Choose your plan, confirm your payment, and activate access to
              WATHACI Connect services.
            </p>
          </div>
          <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
            Powered by {gateway}
          </span>
        </div>

        {/* Plan selection */}
        <div className="grid gap-4 md:grid-cols-2">
          {PLANS.map((plan) => {
            const isSelected = plan.id === selectedPlanId;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlanId(plan.id)}
                className={`
                  text-left
                  rounded-lg
                  border
                  p-4
                  text-sm
                  transition
                  ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50"
                      : "border-gray-200 bg-white hover:border-emerald-300"
                  }
                `}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-gray-900">
                    {plan.name}
                  </span>
                  <span className="text-xs text-gray-600 uppercase">
                    {plan.billingCycle === "monthly" ? "MONTHLY" : "ANNUAL"}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-lg font-bold text-emerald-700">
                    {plan.currency} {plan.amount}
                  </span>
                  <span className="text-xs text-gray-500">
                    / {plan.billingCycle === "monthly" ? "month" : "year"}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{plan.description}</p>
              </button>
            );
          })}
        </div>

        {/* Email + trial toggle */}
        <div className="grid gap-4 md:grid-cols-2 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Account email for this subscription
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="you@example.com"
              required
            />
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={isTrial}
              onChange={(e) => setIsTrial(e.target.checked)}
              className="h-3 w-3 text-emerald-600 border-gray-300 rounded"
            />
            <span>
              Apply free trial if available for this plan (subject to
              eligibility)
            </span>
          </label>
        </div>

        {/* Status messages */}
        {paymentSuccess && (
          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
            Payment initiated successfully. Your subscription will activate once
            the payment is confirmed. You&apos;ll receive an email shortly.
          </p>
        )}

        {lastPaymentError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            The last payment attempt failed with code:{" "}
            <span className="font-mono">{lastPaymentError}</span>. You can retry
            or ask Ciso for help to understand what this means and what to do
            next.
          </p>
        )}

        {/* Pay now button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handlePayNow}
            disabled={isPaying || !customerEmail}
            className="
              inline-flex
              items-center
              px-5
              py-2
              text-sm
              rounded-md
              bg-emerald-600
              text-white
              hover:bg-emerald-700
              disabled:bg-gray-300
              disabled:cursor-not-allowed
            "
          >
            {isPaying
              ? "Processing payment…"
              : `Pay ${selectedPlan.currency} ${selectedPlan.amount} now`}
          </button>
        </div>
      </div>

      {/* Inline Ciso helper focused on payments */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
            C
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-900">
              @Ask Ciso for help with this payment
            </p>
            <p className="text-xs text-emerald-700">
              Not sure about the plan, pricing, currency, gateway or what an
              error means? Ask Ciso and mention your situation.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <textarea
            rows={3}
            className="
              w-full
              text-xs
              border
              border-emerald-200
              rounded-md
              px-2
              py-1.5
              focus:outline-none
              focus:ring-1
              focus:ring-emerald-500
              bg-white
            "
            placeholder="Example: What does this Lenco error mean for my SME Basic monthly plan in USD, and what should I do next?"
            value={cisoQuestion}
            onChange={(e) => setCisoQuestion(e.target.value)}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAskCiso}
              disabled={isCisoLoading || !cisoQuestion.trim()}
              className="
                text-xs
                px-3
                py-1.5
                rounded-md
                bg-emerald-600
                text-white
                hover:bg-emerald-700
                disabled:bg-gray-300
                disabled:cursor-not-allowed
              "
            >
              {isCisoLoading ? "Ciso is thinking…" : "Ask Ciso about this payment"}
            </button>
          </div>
        </div>

        {cisoAnswer && (
          <div className="bg-white border border-emerald-100 rounded-md p-2.5 text-xs text-gray-800 whitespace-pre-wrap">
            {cisoAnswer}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentCheckout;
