interface AIStageSuggestionsProps {
  suggestions: string[];
}

export default function AIStageSuggestions({ suggestions }: AIStageSuggestionsProps) {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-400">AI assistance</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
        {suggestions.map((suggestion) => (
          <li key={suggestion}>{suggestion}</li>
        ))}
      </ul>
    </div>
  );
}

