import { Fragment } from "react";

function renderInlineBold(line) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={index} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export default function FormattedText({ text, inverse = false }) {
  if (!text) return null;

  const lines = String(text)
    .replace(/\r\n/g, "\n")
    .split("\n");

  return (
    <div className="space-y-1.5 whitespace-pre-wrap break-words leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        if (inverse) {
          return <p key={idx}>{trimmed}</p>;
        }

        const isBullet = /^([-•*]|\d+\.)\s+/.test(trimmed);
        return (
          <p key={idx} className={isBullet ? "pl-1.5" : undefined}>
            {renderInlineBold(trimmed)}
          </p>
        );
      })}
    </div>
  );
}
