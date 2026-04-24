const cache = {};

export async function fetchPatternInstructions(designId) {
  if (cache[designId] !== undefined) return cache[designId];

  try {
    const url = `https://raw.githubusercontent.com/freesewing/freesewing/develop/markdown/org/docs/designs/${designId}/instructions/en.md`;
    const res = await fetch(url);
    if (!res.ok) {
      cache[designId] = null;
      return null;
    }
    const md = await res.text();
    cache[designId] = md;
    return md;
  } catch {
    return null;
  }
}
