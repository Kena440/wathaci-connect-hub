import { accountTypes, type AccountTypeValue } from "@/data/accountTypes";
import { cn } from "@/lib/utils";

interface AccountTypeSelectorProps {
  value: AccountTypeValue | "";
  onChange: (value: AccountTypeValue) => void;
  disabled?: boolean;
  error?: string | null;
}

export const AccountTypeSelector = ({ value, onChange, disabled = false, error }: AccountTypeSelectorProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Select Account Type</p>
          <p className="text-sm text-gray-600">Choose the option that best describes how you will use Wathaci.</p>
        </div>
        <span className="text-xs font-medium uppercase tracking-wide text-orange-600">Required</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {accountTypes.map((type) => {
          const isSelected = value === type.value;
          return (
            <button
              key={type.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(type.value)}
              className={cn(
                "flex h-full flex-col rounded-xl border bg-white p-4 text-left shadow-sm transition focus:outline-none",
                isSelected
                  ? "border-orange-500 ring-2 ring-orange-200"
                  : "border-gray-200 hover:border-orange-400 hover:shadow",
                disabled && "cursor-not-allowed opacity-60"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    isSelected ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"
                  )}
                >
                  <type.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900">{type.label}</p>
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        isSelected ? "bg-orange-500" : "bg-gray-300"
                      )}
                      aria-hidden
                    />
                  </div>
                  <p className="text-sm text-gray-600">{type.description}</p>
                </div>
              </div>
              {type.idealFor?.length ? (
                <ul className="mt-3 list-disc space-y-1 pl-9 text-xs text-gray-600">
                  {type.idealFor.slice(0, 2).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </button>
          );
        })}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
};

export default AccountTypeSelector;
