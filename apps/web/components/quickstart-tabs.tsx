"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { CopyButton } from "@/components/copy-button";
import { cn } from "cn";

export function QuickstartTabs({ local, github }: { local: string; github: string }) {
  return (
    <Tabs.Root defaultValue="local" className="mx-auto mt-2xl w-full max-w-article">
      <Tabs.List aria-label="Scan source" className="flex justify-center gap-xs">
        {[
          { value: "local", label: "Local path", command: local },
          { value: "github", label: "GitHub URL", command: github },
        ].map((tab) => (
          <Tabs.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "rounded-corner-md border border-transparent px-lg py-sm text-label-sm text-text-secondary outline-none hover:text-text-primary focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=active]:border-border-primary data-[state=active]:bg-surface-bg data-[state=active]:text-text-primary"
            )}
          >
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {[
        { value: "local", command: local },
        { value: "github", command: github },
      ].map((panel) => (
        <Tabs.Content key={panel.value} value={panel.value} className="flex flex-col items-center gap-xl pt-2xl text-center outline-none">
          <code className="max-w-full break-words font-mono text-heading text-text-primary">{panel.command}</code>
          <p className="text-label-sm text-text-secondary">Up to 5,000 files or 25 MB per scan. No repository code is executed.</p>
          <CopyButton text={panel.command}>Copy command</CopyButton>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
