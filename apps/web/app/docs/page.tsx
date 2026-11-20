export default function DocsPage() {
  return (
    <main>
      <h1>BusFactor documentation</h1>
      <h2>Quickstart</h2>
      <pre>npx busfactor scan ./my-repo</pre>
      <h2>CLI</h2>
      <p>`busfactor scan &lt;path|url&gt; --out &lt;dir&gt; --format md,json --fail-under &lt;score&gt;`</p>
      <h2>Scoring</h2>
      <p>Seven dimensions, 100 points. Code computes the score; the LLM explains and drafts.</p>
      <h2>Limits</h2>
      <p>5,000 files or 25 MB per scan. Public GitHub URLs only. No repository code is executed.</p>
      <h2>Privacy</h2>
      <p>Source snapshots are deleted after 7 days. Secrets are redacted everywhere.</p>
    </main>
  );
}
