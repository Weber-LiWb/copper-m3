// Finds Copper's citations, like [Copper Home User Guide, p. 9], in a reply
// so the chat panel can turn each one into a link to that PDF page.
// Plain data only, so the client-side chat panel can import it.
import { DOCUMENTS } from "@/lib/copper/documents";

export type Citation = { title: string; page: number; href: string };

/** A reply cut into plain text and citations, in order. */
export type ReplyPart = string | Citation;

const CITATION = /\[([^[\]]+?),\s*(?:p\.|page)\s*(\d+)\]/gi;

/** The link for a document title and page, or undefined for an unknown title. */
export function citationHref(title: string, page: number): string | undefined {
  const doc = DOCUMENTS.find(
    (d) => d.title.toLowerCase() === title.trim().toLowerCase(),
  );
  return doc && page >= 1 ? `${doc.file}#page=${page}` : undefined;
}

/** Splits a reply into text and citations. Unknown titles stay as text. */
export function splitCitations(reply: string): ReplyPart[] {
  const parts: ReplyPart[] = [];
  let last = 0;
  for (const match of reply.matchAll(CITATION)) {
    const page = Number(match[2]);
    const href = citationHref(match[1], page);
    if (!href) continue;
    if (match.index > last) parts.push(reply.slice(last, match.index));
    const doc = DOCUMENTS.find((d) => d.file === href.split("#")[0])!;
    parts.push({ title: doc.title, page, href });
    last = match.index + match[0].length;
  }
  if (last < reply.length) parts.push(reply.slice(last));
  return parts;
}
