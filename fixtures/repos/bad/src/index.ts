export function run() {
  try {
    fetch("https://example.com");
  } catch (error) {}
  const token = process.env.UNDOCUMENTED_TOKEN;
  return token;
}
