import React from "react";
import type { AccountType } from "@/lib/wathaciSupabaseClient";

const accountTypeDetails: { value: AccountType; label: string; description: string }[] = [
  { value: "SME", label: "SME", description: "Operate and grow your business." },
  { value: "INVESTOR", label: "Investor", description: "Discover and fund opportunities." },
  { value: "SERVICE_PROVIDER", label: "Service Provider", description: "Offer services to SMEs and partners." },
  { value: "PARTNER", label: "Partner", description: "Collaborate as an ecosystem partner." },
];

export interface AccountTypeSelectorProps {
  onSelect: (accountType: AccountType) => void;
  selected?: AccountType;
}

export const AccountTypeSelector: React.FC<AccountTypeSelectorProps> = ({
  onSelect,
  selected,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-semibold">Choose your account type</h2>
      <p className="text-sm text-gray-600">
        Select how you want to use Wathaci. You can request changes later from support.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {accountTypeDetails.map((type) => {
          const isSelected = selected === type.value;
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => onSelect(type.value)}
              className={`rounded-lg border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                isSelected ? "border-blue-600 ring-2 ring-blue-200" : "border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">{type.label}</span>
                {isSelected && <span className="text-sm font-semibold text-blue-600">Selected</span>}
              </div>
              <p className="mt-2 text-sm text-gray-600">{type.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AccountTypeSelector;
