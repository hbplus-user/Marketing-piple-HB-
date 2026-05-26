export default function RoundBadge({ round }: { round: number }) {
  return (
    <span className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700">
      R{round}
    </span>
  );
}
