"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

type CopyButtonProps = {
  text: string;
  children: React.ReactNode;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
};

export function CopyButton({ text, children, variant = "default", size = "default", className }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function copyToClipboard() {
    let ok = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch {
        // Restricted contexts reject the async API; fall back to selection copy.
      }
    }
    if (!ok) {
      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.className = "fixed opacity-0 pointer-events-none";
      document.body.appendChild(field);
      field.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      field.remove();
    }

    if (timer.current) clearTimeout(timer.current);
    setCopied(ok);
    setMessage(ok ? `Copied ${text}` : "Copy failed. Select the text and copy it manually.");
    timer.current = setTimeout(() => {
      setCopied(false);
      setMessage("");
    }, 2000);
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn("font-mono", className)}
        onClick={copyToClipboard}
        aria-label={`Copy ${text}`}
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copied ? "Copied" : children}
      </Button>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {message}
      </span>
    </>
  );
}
