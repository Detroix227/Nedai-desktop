interface SuggestionChipProps {
  label: string;
  onPress?: () => void;
}

export function SuggestionChip({ label, onPress }: SuggestionChipProps) {
  return (
    <button
      onClick={onPress}
      className="bg-slate-100 px-5 py-3 rounded-2xl mr-3 mb-2 border border-slate-200 hover:bg-slate-200 transition-colors"
    >
      <span className="text-slate-800 font-medium text-sm">
        {label}
      </span>
    </button>
  );
}
