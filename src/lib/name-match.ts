/**
 * Matches names typed or dictated by a person ("anna", "Chloe", "ben de vries") against a
 * class list. Deliberately cautious: a name is only accepted when it points at exactly one
 * person — anything ambiguous or unknown is reported back so the caller can ask, never guessed.
 */

export interface Person {
  id: string;
  name: string;
}

export interface NameMatchResult {
  /** person id -> the query that matched them */
  matched: Map<string, string>;
  ambiguous: { query: string; candidates: string[] }[];
  unmatched: string[];
}

export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // é, ë, ï … -> e, e, i
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Splits free-text lists ("Anna, Ben; Chloë") — callers may pass whole sentences' worth of names in one string. */
export function splitNameList(values: string[]): string[] {
  return values
    .flatMap((v) => v.split(/[,;\n]+/))
    .map((v) => v.trim())
    .filter(Boolean);
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return prev[b.length];
}

type Entry = Person & { norm: string; first: string; tokens: string[] };

/** Returns the people a single query could refer to, using progressively looser rules; stops at the first rule that finds anyone. */
function candidatesFor(query: string, entries: Entry[]): Entry[] {
  const q = normalizeName(query);
  if (!q) return [];

  const tiers: ((e: Entry) => boolean)[] = [
    (e) => e.norm === q,
    (e) => !q.includes(" ") && e.first === q,
    (e) => e.norm.startsWith(q),
    (e) => q.length >= 3 && e.tokens.some((t) => t.startsWith(q)),
    // A multi-word query that starts at a word boundary ("van den berg"). Plain substring matching is
    // deliberately not used: "Lisa" must not silently match "Anna-Lisa".
    (e) => q.length >= 3 && ` ${e.norm}`.includes(` ${q}`),
  ];
  for (const test of tiers) {
    const found = entries.filter(test);
    if (found.length > 0) return found;
  }

  // Typos: compare against the first name and the full name, accept only the single closest match.
  const threshold = q.length <= 4 ? 1 : 2;
  const scored = entries
    .map((e) => ({ e, d: Math.min(editDistance(q, e.first), editDistance(q, e.norm)) }))
    .filter((x) => x.d <= threshold)
    .sort((a, b) => a.d - b.d);
  if (scored.length === 0) return [];
  return scored.filter((x) => x.d === scored[0].d).map((x) => x.e);
}

export function matchNames(queries: string[], people: Person[]): NameMatchResult {
  const entries: Entry[] = people.map((p) => {
    const norm = normalizeName(p.name);
    const tokens = norm.split(" ");
    return { ...p, norm, first: tokens[0] ?? "", tokens };
  });

  const result: NameMatchResult = { matched: new Map(), ambiguous: [], unmatched: [] };
  for (const query of queries) {
    const found = candidatesFor(query, entries);
    if (found.length === 1) result.matched.set(found[0].id, query);
    else if (found.length > 1) result.ambiguous.push({ query, candidates: found.map((f) => f.name) });
    else result.unmatched.push(query);
  }
  return result;
}
