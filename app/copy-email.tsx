'use client';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

// The one button on the page that needs state: it says "Copied" for two seconds.
export default function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${email}`; // no clipboard access: open the mail app instead
    }
  };
  return (
    <button type="button" className="pill pill-light copy-email" onClick={copy} aria-live="polite">
      {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      {copied ? 'Copied' : 'Copy email'}
    </button>
  );
}
