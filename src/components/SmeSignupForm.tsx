import React, { useState } from "react";
import { callCisoAgent, type CisoMessage } from "@/lib/cisoClient";

type SignupStep = "basic-info" | "business-details" | "confirm";

const SmeSignupForm: React.FC = () => {
  // Form state (simplified – extend to match your real form)
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [country, setCountry] = useState("Zambia");
  const [sector, setSector] = useState("");
  const [step, setStep] = useState<SignupStep>("basic-info");

  // Normal signup state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  // Ciso state (inline helper on this page)
  const [cisoQuestion, setCisoQuestion] = useState("");
  const [cisoAnswer, setCisoAnswer] = useState<string | null>(null);
  const [isCisoLoading, setIsCisoLoading] = useState(false);

  // Example signup handler (placeholder)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    setIsSubmitting(true);

    try {
      // TODO: replace with your real signup API call
      // await signupSmeProfile({ fullName, email, businessName, country, sector });
      console.log("Submitting SME signup", {
        fullName,
        email,
        businessName,
        country,
        sector,
      });
      // Move to next step or show success
      setStep("confirm");
    } catch (err: any) {
      console.error(err);
      setSignupError(
        "There was a problem creating your account. Please try again or ask Ciso for help.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAskCiso = async () => {
    if (!cisoQuestion.trim()) return;

    setIsCisoLoading(true);
    setCisoAnswer(null);

    // Build a rich context message for Ciso
    const contextPayload = {
      userRole: "SME",
      flow: "signup",
      step,
      form: {
        fullName,
        email,
        businessName,
        country,
        sector,
      },
      lastError: signupError,
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
        flow: "signup",
        step,
        lastError: signupError,
      });
      setCisoAnswer(reply);
    } catch (err) {
      console.error(err);
      setCisoAnswer(
        "I ran into a problem trying to help right now. Please try again or email support@wathaci.com.",
      );
    } finally {
      setIsCisoLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Main signup card */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 space-y-4">
        <h1 className="text-xl font-semibold text-gray-900">SME Sign-up – WATHACI Connect</h1>
        <p className="text-sm text-gray-600">
          Create your SME profile so investors, donors, government agencies, and professionals can find and work with you.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step indicator (very simple) */}
          <div className="flex gap-2 text-xs text-gray-500">
            <span className={step === "basic-info" ? "font-semibold" : ""}>1. Basic Info</span>
            <span>·</span>
            <span className={step === "business-details" ? "font-semibold" : ""}>2. Business Details</span>
            <span>·</span>
            <span className={step === "confirm" ? "font-semibold" : ""}>3. Confirm</span>
          </div>

          {/* Basic Info fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Business name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sector / Industry</label>
              <input
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="e.g. Agribusiness, Services, Manufacturing"
              />
            </div>
          </div>

          {signupError && <p className="text-xs text-red-600">{signupError}</p>}

          <div className="flex justify-between items-center pt-2">
            {/* Later you can use this for multi-step navigation */}
            <div className="text-xs text-gray-500">
              Step: <span className="font-medium">{step}</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="
                inline-flex
                items-center
                px-4
                py-1.5
                text-sm
                rounded-md
                bg-emerald-600
                text-white
                hover:bg-emerald-700
                disabled:bg-gray-300
                disabled:cursor-not-allowed
              "
            >
              {isSubmitting ? "Creating account…" : "Create account"}
            </button>
          </div>
        </form>
      </div>

      {/* Inline Ciso helper for this page */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">C</div>
            <div>
              <p className="text-sm font-semibold text-emerald-900">@Ask Ciso for help</p>
              <p className="text-xs text-emerald-700">
                Stuck on any part of SME sign-up? Ask a question and Ciso will guide you.
              </p>
            </div>
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
            placeholder="Example: I'm not sure what to write under Business Description for my SME in the services sector."
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
              {isCisoLoading ? "Ciso is thinking…" : "Ask Ciso"}
            </button>
          </div>
        </div>

        {cisoAnswer && (
          <div className="bg-white border border-emerald-100 rounded-md p-2.5 text-xs text-gray-800">{cisoAnswer}</div>
        )}
      </div>
    </div>
  );
};

export default SmeSignupForm;
