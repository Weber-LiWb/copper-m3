import { describe, expect, it } from "vitest";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "@/lib/ai/call";
import { DOCUMENTS } from "@/lib/copper/documents";
import { getPassages, PASSAGE_MODEL } from "@/lib/copper/passages";
import { closestPassages } from "@/lib/copper/search";

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

describe("search_docs", () => {
  it("returns the 5 closest passages with title, page and a link to that page", () => {
    const target = getPassages()[10];
    const hits = closestPassages(target.embedding);
    expect(hits).toHaveLength(5);
    expect(hits[0]).toMatchObject({ title: target.title, page: target.page });
    expect(hits[0].score).toBeCloseTo(1, 2);
    const doc = DOCUMENTS.find((d) => d.id === target.docId)!;
    expect(hits[0].link).toBe(`${doc.file}#page=${target.page}`);
    expect(hits[0].text.startsWith(target.title)).toBe(false);
    for (let i = 1; i < hits.length; i++)
      expect(hits[i].score).toBeLessThanOrEqual(hits[i - 1].score);
  });

  it("is one of Ask Copper's tools", async () => {
    const { copperTools } = await import("@/lib/copper/assistant/tools");
    expect(copperTools.search_docs.description).toMatch(/warranty/);
  });
});
