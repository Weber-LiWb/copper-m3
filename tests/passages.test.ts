import { describe, expect, it } from "vitest";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "@/lib/ai/call";
import { DOCUMENTS } from "@/lib/copper/documents";
import { getPassages, PASSAGE_MODEL } from "@/lib/copper/passages";

describe("passages.json", () => {
  const passages = getPassages();

  it("was made with the app's embedding model", () => {
    expect(PASSAGE_MODEL).toBe(EMBEDDING_MODEL);
  });

  it("has passages from every customer document", () => {
    for (const doc of DOCUMENTS) {
      expect(passages.some((p) => p.docId === doc.id)).toBe(true);
    }
  });

  it("keeps the title and page with each passage, and starts with the title", () => {
    for (const p of passages) {
      const doc = DOCUMENTS.find((d) => d.id === p.docId);
      expect(doc?.title).toBe(p.title);
      expect(p.page).toBeGreaterThanOrEqual(1);
      expect(p.text.startsWith(`${p.title}: `)).toBe(true);
      expect(p.embedding).toHaveLength(EMBEDDING_DIMENSIONS);
    }
    expect(new Set(passages.map((p) => p.id)).size).toBe(passages.length);
  });
});
