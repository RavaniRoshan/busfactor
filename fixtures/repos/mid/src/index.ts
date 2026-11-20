export function start() {
  const port = process.env.PORT ?? "3000";
  const extra = process.env.EXTRA_TOKEN;
  return port + String(extra);
}
