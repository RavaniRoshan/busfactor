export function CiteChip({ file, line }: { file: string; line: number }) {
  return (
    <code className="rw-cite">
      {file}:{line}
    </code>
  );
}
