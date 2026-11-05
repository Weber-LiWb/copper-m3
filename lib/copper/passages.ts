// The customer documents, cut into passages and embedded ahead of time by
// `npm run passages` (scripts/build-passages.ts). The JSON is imported once,
// so the passages sit in memory from the moment the app starts.
import data from "@/lib/copper/data/passages.json";

export type Passage = {
  id: string;
  /** The document's id in DOCUMENTS (lib/copper/documents.ts). */
  docId: string;
  title: string;
  /** 1-based page number in the PDF. */
  page: number;
  /** Starts with the document title, so the embedding knows the source. */
  text: string;
  embedding: number[];
};

export type PassageFile = {
  model: string;
  dimensions: number;
  passages: Passage[];
};

const FILE = data as PassageFile;

/** Every passage from every customer document, with its embedding. */
export function getPassages(): Passage[] {
  return FILE.passages;
}

/** The embedding model the passages were made with. */
export const PASSAGE_MODEL = FILE.model;
