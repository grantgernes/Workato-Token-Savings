export function prettyScenarioName(raw: string): string {
  return raw
    .split("-")
    .filter(Boolean)
    .map((word) => {
      const first = word.charAt(0);
      const rest = word.slice(1);
      return first.toUpperCase() + rest;
    })
    .join(" ");
}
