const URL_REGEX = /(https?:\/\/[^\s]+)/g;
const isUrl = (s: string) => /^https?:\/\//.test(s);

// Renders plain text with any http(s) URLs inside it turned into clickable links —
// covers comments where someone pasted a raw link instead of using the reference-link field.
export default function Linkify({ text, className }: { text: string; className?: string }) {
  const parts = text.split(URL_REGEX);
  return (
    <>
      {parts.map((part, i) =>
        isUrl(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={className ?? 'text-[#a9674d] hover:underline break-all'}
          >
            {part}
          </a>
        ) : (
          part
        )
      )}
    </>
  );
}
