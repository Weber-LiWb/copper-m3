// Module 3: search the customer documents by meaning. The question is
// embedded with the same model as the passages, then compared with every
// passage (cosine similarity); the closest ones come back with their source.
import { callEmbed } from "@/lib/ai/call";
import { DOCUMENTS } from "@/lib/copper/documents";
import { getPassages, type Passage } from "@/lib/copper/passages";

/** How many passages search_docs returns. */
export const TOP_K = 5;

export type DocHit = {
  title: string;
  page: number;
  /** Opens the PDF at that page, e.g. /docs/copper-plus-faq.pdf#page=2 */
  link: string;
  /** The passage, without the title it starts with. */
  text: string;
  /** How close it is to the question, 0 to 1 (higher is closer). */
  score: number;
};

export type DocSearch = { query: string; passages: DocHit[] };

function norm(v: number[]): number {
  let sum = 0;
  for (const x of v) sum += x * x;
  return Math.sqrt(sum);
}

// Each passage's length, worked out once since the passages never change.
let norms: Map<string, number> | undefined;
function normOf(p: Passage): number {
  norms ??= new Map(getPassages().map((q) => [q.id, norm(q.embedding)]));
  return norms.get(p.id) ?? norm(p.embedding);
}

/** Cosine similarity: 1 means the same direction (same meaning). */
function cosine(a: number[], aNorm: number, p: Passage): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * p.embedding[i];
  return dot / (aNorm * normOf(p) || 1);
}

/** The `k` passages closest to an already-embedded question. */
export function closestPassages(queryEmbedding: number[], k = TOP_K): DocHit[] {
  const qNorm = norm(queryEmbedding);
  return getPassages()
    .map((p) => ({ p, score: cosine(queryEmbedding, qNorm, p) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ p, score }) => {
      const file = DOCUMENTS.find((d) => d.id === p.docId)?.file ?? "";
      return {
        title: p.title,
        page: p.page,
        link: `${file}#page=${p.page}`,
        text: p.text.startsWith(`${p.title}: `)
          ? p.text.slice(p.title.length + 2)
          : p.text,
        score: Math.round(score * 1000) / 1000,
      };
    });
}

/** search_docs: embeds the question and returns the 5 closest passages. */
export async function searchDocs(query: string): Promise<DocSearch> {
  const embedding = await callEmbed(
    { module: 3, feature: "search-docs" },
    query,
    "RETRIEVAL_QUERY",
  );
  return { query, passages: closestPassages(embedding) };
}
