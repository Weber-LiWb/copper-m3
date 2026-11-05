import { describe, expect, it } from "vitest";
import {
  COPPER_INSTRUCTIONS,
  NOT_FOUND,
} from "@/lib/copper/assistant/instructions";
import { splitCitations } from "@/lib/copper/citations";

describe("citations", () => {
  it("turns [Title, p. N] into a link to that PDF page", () => {
    expect(
      splitCitations(
        "Unplug it for 30 seconds [Copper Home User Guide, p. 9]. Done.",
      ),
    ).toEqual([
      "Unplug it for 30 seconds ",
      {
        title: "Copper Home User Guide",
        page: 9,
        href: "/docs/copper-home-user-guide.pdf#page=9",
      },
      ". Done.",
    ]);
  });

  it("handles two citations in a row and small spelling differences", () => {
    const parts = splitCitations(
      "Full refund within 14 days [Copper Plus FAQ, p. 5] [copper state labs terms and conditions, page 4].",
    );
    expect(parts.filter((p) => typeof p !== "string")).toEqual([
      expect.objectContaining({ href: "/docs/copper-plus-faq.pdf#page=5" }),
      expect.objectContaining({
        title: "Copper State Labs Terms and Conditions",
        href: "/docs/copper-terms-and-conditions.pdf#page=4",
      }),
    ]);
  });

  it("leaves unknown documents and plain brackets as text", () => {
    const text = "See [Some Other Guide, p. 2] and [note].";
    expect(splitCitations(text)).toEqual([text]);
  });
});

describe("Copper's support rules", () => {
  it("require search_docs, a citation per sentence and the not-found reply", () => {
    expect(COPPER_INSTRUCTIONS).toMatch(/search_docs/);
    expect(COPPER_INSTRUCTIONS).toMatch(/Every sentence/);
    expect(COPPER_INSTRUCTIONS).toContain("[Copper Home User Guide, p. 9]");
    expect(COPPER_INSTRUCTIONS).toContain(NOT_FOUND);
    expect(COPPER_INSTRUCTIONS).toMatch(/Copper Crew/);
    expect(COPPER_INSTRUCTIONS).toMatch(/never guess/i);
  });
});
