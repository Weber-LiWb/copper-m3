// Builds lib/copper/data/passages.json from the PDFs in public/docs/:
// reads each page, splits it into passages of a few sentences, starts each
// passage with its document's title, and embeds every passage with Gemini.
// Run it again whenever the PDFs change:  npm run passages
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { extractText, getDocumentProxy } from "unpdf";
import {
  callEmbedMany,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
} from "../lib/ai/call";
import { DOCUMENTS } from "../lib/copper/documents";
import type { Passage, PassageFile } from "../lib/copper/passages";

/** Sentences per passage, and a size cap so one passage stays focused. */
const SENTENCES_PER_PASSAGE = 3;
const MAX_CHARS = 600;
/** Passages per embedding batch (free tier: 100 a minute). */
const BATCH = 90;

const root = process.cwd();

/** Tidies PDF text: joins hyphenated line breaks and collapses spaces. */
function clean(text: string): string {
  return text
    .replace(/(\w)-\n(\w)/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

/** Splits text into sentences at . ! or ? followed by a capital or digit. */
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=["“(]?[A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Groups sentences into passages of a few sentences each. */
function passagesOf(text: string): string[] {
  const out: string[] = [];
  let current: string[] = [];
  for (const sentence of sentences(text)) {
    const next = [...current, sentence].join(" ");
    if (
      current.length > 0 &&
      (current.length >= SENTENCES_PER_PASSAGE || next.length > MAX_CHARS)
    ) {
      out.push(current.join(" "));
      current = [];
    }
    current.push(sentence);
  }
  if (current.length > 0) out.push(current.join(" "));
  return out;
}

/** Embeds one batch; if the per-minute limit is hit, waits and tries again. */
async function embedWithRetry(texts: string[]): Promise<number[][]> {
  for (let attempt = 1; ; attempt++) {
    try {
      const result = await callEmbedMany(
        { module: 3, feature: "passages" },
        texts,
        "RETRIEVAL_DOCUMENT",
      );
      return result.embeddings;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt >= 4 || !/quota|rate/i.test(message)) throw error;
      console.log("  Hit the per-minute limit; waiting a minute and retrying...");
      await new Promise((r) => setTimeout(r, 65_000));
    }
  }
}

async function main() {
  const drafts: Omit<Passage, "embedding">[] = [];
  for (const doc of DOCUMENTS) {
    const bytes = await readFile(join(root, "public", doc.file));
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { text: pages } = await extractText(pdf, { mergePages: false });
    let n = 0;
    pages.forEach((pageText, i) => {
      for (const passage of passagesOf(clean(pageText))) {
        n += 1;
        drafts.push({
          id: `${doc.id}-p${i + 1}-${n}`,
          docId: doc.id,
          title: doc.title,
          page: i + 1,
          text: `${doc.title}: ${passage}`,
        });
      }
    });
  }

  // Google's free tier counts every passage as one request and allows 100 a
  // minute, so embed in batches and wait a minute between them.
  console.log(`Embedding ${drafts.length} passages...`);
  const embeddings: number[][] = [];
  for (let start = 0; start < drafts.length; start += BATCH) {
    if (start > 0) {
      console.log(`  ${start} done; waiting a minute (free-tier limit)...`);
      await new Promise((r) => setTimeout(r, 62_000));
    }
    const batch = drafts.slice(start, start + BATCH);
    embeddings.push(...(await embedWithRetry(batch.map((d) => d.text))));
  }

  const file: PassageFile = {
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    passages: drafts.map((d, i) => ({
      ...d,
      // 5 decimals is plenty for search and keeps the file small.
      embedding: embeddings[i].map((x) => Math.round(x * 1e5) / 1e5),
    })),
  };
  const out = join(root, "lib/copper/data/passages.json");
  await writeFile(out, JSON.stringify(file) + "\n");

  console.log(`Saved ${file.passages.length} passages to lib/copper/data/passages.json`);
  for (const doc of DOCUMENTS) {
    const mine = file.passages.filter((p) => p.docId === doc.id);
    const pages = new Set(mine.map((p) => p.page)).size;
    console.log(`  ${doc.title}: ${mine.length} passages from ${pages} pages`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
