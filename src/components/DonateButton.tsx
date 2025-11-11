import { FormEvent, useMemo, useState } from "react";

const PRESET_AMOUNTS = [20, 50, 100, 250];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-ZM", {
    style: "currency",
    currency: "ZMW",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const parseEnvNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getSupabaseFunctionsUrl = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  if (!supabaseUrl) return "";
  if (supabaseUrl.includes(".functions.")) return supabaseUrl;
  if (supabaseUrl.includes("supabase.co")) {
    return supabaseUrl.replace(".supabase.co", ".functions.supabase.co");
  }
  return `${supabaseUrl}/functions/v1`;
};

type DonateButtonProps = {
  campaignId?: string;
  source?: string;
};

type CreateDonationResponse = {
  ok: boolean;
  data?: {
    donationId: string;
    lencoReference: string;
    checkoutUrl?: string | null;
    paymentInstructions?: Record<string, unknown> | null;
  };
  error?: {
    code?: string;
    message: string;
    details?: string;
  };
};

export const DonateButton = ({ campaignId, source = "web" }: DonateButtonProps) => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | "">("");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [donorName, setDonorName] = useState("");
  const [donateAnonymously, setDonateAnonymously] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minAmount = useMemo(
    () => parseEnvNumber(import.meta.env.VITE_MIN_PAYMENT_AMOUNT, 20),
    []
  );
  const maxAmount = useMemo(
    () => parseEnvNumber(import.meta.env.VITE_MAX_PAYMENT_AMOUNT, 5000),
    []
  );
  const platformFeePercentage = useMemo(
    () => parseEnvNumber(import.meta.env.VITE_PLATFORM_FEE_PERCENTAGE, 5),
    []
  );

  const amount = useMemo(() => {
    if (selectedAmount !== "") return selectedAmount;
    const parsedCustom = Number(customAmount);
    return Number.isFinite(parsedCustom) && parsedCustom > 0 ? parsedCustom : "";
  }, [customAmount, selectedAmount]);

  const platformFeeAmount = useMemo(() => {
    if (typeof amount !== "number") return 0;
    return Math.round((platformFeePercentage / 100) * amount);
  }, [amount, platformFeePercentage]);

  const netAmount = useMemo(() => {
    if (typeof amount !== "number") return 0;
    return amount - platformFeeAmount;
  }, [amount, platformFeeAmount]);

  const totalCharged = useMemo(() => {
    if (typeof amount !== "number") return 0;
    return amount;
  }, [amount]);

  const closeModal = () => {
    setModalOpen(false);
    setSelectedAmount("");
    setCustomAmount("");
    setDonorName("");
    setDonateAnonymously(false);
    setMessage("");
    setSubmitting(false);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (typeof amount !== "number") {
      setError("Please select or enter a donation amount.");
      return;
    }

    if (amount < minAmount) {
      setError(`Minimum donation is ${formatCurrency(minAmount)}.`);
      return;
    }

    if (amount > maxAmount) {
      setError(`Maximum donation per transaction is ${formatCurrency(maxAmount)}.`);
      return;
    }

    const functionsUrl = getSupabaseFunctionsUrl();
    if (!functionsUrl) {
      setError("Supabase configuration missing. Please try again later.");
      return;
    }

    const anonKey =
      import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY;

    const payload = {
      amount,
      currency: "ZMW",
      campaignId: campaignId ?? null,
      donorName: donateAnonymously ? null : donorName?.trim() || null,
      donateAnonymously,
      message: message?.trim() || null,
      source,
    };

    setSubmitting(true);

    try {
      const response = await fetch(
        functionsUrl.endsWith("/create-donation")
          ? functionsUrl
          : `${functionsUrl.replace(/\/$/, "")}/create-donation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(anonKey ? { apikey: anonKey } : {}),
          },
          body: JSON.stringify(payload),
        }
      );

      const json = (await response.json()) as CreateDonationResponse;

      if (!response.ok || !json.ok) {
        throw new Error(json.error?.message || "Failed to start donation.");
      }

      const checkoutUrl = json.data?.checkoutUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }

      if (json.data?.paymentInstructions) {
        // eslint-disable-next-line no-alert
        alert(
          "Donation created. Follow the provided payment instructions: " +
            JSON.stringify(json.data.paymentInstructions)
        );
      } else {
        // eslint-disable-next-line no-alert
        alert("Donation created successfully.");
      }

      closeModal();
    } catch (submitError) {
      console.error("DonateButton: Failed to create donation", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to start donation. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="rounded-full bg-red-600 px-5 py-2 text-white shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        Donate
      </button>

      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Support SMEs through Wathaci Connect</h2>
                {/* SME impact message required by business brief. */}
                <p className="mt-2 text-sm text-gray-600">
                  Your donation helps struggling SMEs cover short-term gaps—like working capital,
                  inventory, rent, and operational costs—so they can stabilise, strengthen their
                  operations, and become investor-ready for long-term sustainability.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close donation modal"
                onClick={closeModal}
                className="text-gray-500 transition hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <div>
                <span className="text-sm font-medium text-gray-700">Choose an amount</span>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {PRESET_AMOUNTS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(preset);
                        setCustomAmount("");
                      }}
                      className={`rounded border px-3 py-2 text-sm transition ${
                        amount === preset
                          ? "border-red-600 bg-red-50 text-red-700"
                          : "border-gray-200 text-gray-700 hover:border-red-300 hover:text-red-700"
                      }`}
                    >
                      {formatCurrency(preset)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="custom-amount">
                  Or enter a custom amount
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                    K
                  </span>
                  <input
                    id="custom-amount"
                    type="number"
                    min={minAmount}
                    max={maxAmount}
                    step="1"
                    value={customAmount}
                    onChange={(event) => {
                      setCustomAmount(event.target.value);
                      setSelectedAmount("");
                    }}
                    className="block w-full rounded-r-md border border-gray-300 p-2 focus:border-red-500 focus:outline-none focus:ring-red-500"
                    placeholder={`${minAmount} - ${maxAmount}`}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Minimum {formatCurrency(minAmount)} · Maximum {formatCurrency(maxAmount)}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700" htmlFor="donor-name">
                    Name (optional)
                  </label>
                  <input
                    id="donor-name"
                    type="text"
                    value={donorName}
                    onChange={(event) => setDonorName(event.target.value)}
                    disabled={donateAnonymously}
                    className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-red-500 focus:outline-none focus:ring-red-500 disabled:bg-gray-100"
                    placeholder="Jane Doe"
                  />
                  <label className="mt-2 flex items-center space-x-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={donateAnonymously}
                      onChange={(event) => {
                        setDonateAnonymously(event.target.checked);
                        if (event.target.checked) {
                          setDonorName("");
                        }
                      }}
                    />
                    <span>Donate anonymously</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700" htmlFor="donor-message">
                    Message to the SME (optional)
                  </label>
                  <textarea
                    id="donor-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-red-500 focus:outline-none focus:ring-red-500"
                    placeholder="Share your encouragement or reason for donating"
                  />
                </div>
              </div>

              {typeof amount === "number" && amount > 0 && (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span>Donation</span>
                    <span>{formatCurrency(amount)}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span>
                      Platform support fee
                      <span className="text-xs text-gray-500"> ({platformFeePercentage}% helps keep Wathaci Connect running)</span>
                    </span>
                    <span>{formatCurrency(platformFeeAmount)}</span>
                  </div>
                  <div className="mt-1 flex justify-between border-t border-gray-200 pt-2 font-medium">
                    <span>Total charged</span>
                    <span>{formatCurrency(totalCharged)}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-gray-500">
                    <span>Net to SMEs</span>
                    <span>{formatCurrency(netAmount)}</span>
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-red-300"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Processing..." : "Proceed to donate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default DonateButton;
