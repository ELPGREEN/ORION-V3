import { describe, it, expect } from "vitest";
import { stripMarkdown } from "../text-utils";

describe("stripMarkdown", () => {
  it("strips JSON blocks", () => {
    const input = "Here is some code: ```json\n{\"key\": \"value\"}\n``` and more text.";
    expect(stripMarkdown(input)).toBe("Here is some code:  and more text.");
  });

  it("strips identified objects JSON", () => {
    const input = 'Found objects: {"identifiedObjects" : [{"name": "phone"}]} in the scene.';
    expect(stripMarkdown(input)).toBe("Found objects:  in the scene.");
  });

  it("strips LEARN facts", () => {
    const input = "I learned something [LEARN: user likes coffee] today.";
    expect(stripMarkdown(input)).toBe("I learned something  today.");
  });

  it("strips bold and italic markers", () => {
    const input = "This is **bold**, this is *italic*, and ___both___.";
    expect(stripMarkdown(input)).toBe("This is bold, this is italic, and both.");
  });

  it("strips headers", () => {
    const input = "# Header 1\n## Header 2\nRegular text.";
    // Note: HEADER_REGEX has 'gm' flags and replaces with ""
    // it will leave the newlines
    expect(stripMarkdown(input)).toBe("Header 1\nHeader 2\nRegular text.");
  });

  it("handles links correctly by keeping the label", () => {
    const input = "Click [here](https://example.com) for more.";
    expect(stripMarkdown(input)).toBe("Click here for more.");
  });

  it("strips URLs", () => {
    const input = "Visit https://google.com for info.";
    expect(stripMarkdown(input)).toBe("Visit  for info.");
  });

  it("strips comments", () => {
    const input = "Text // this is a comment\nMore text.";
    expect(stripMarkdown(input)).toBe("Text \nMore text.");
  });

  it("strips HTML tags", () => {
    const input = "This is <b>bold</b> and <br/> a break.";
    expect(stripMarkdown(input)).toBe("This is bold and  a break.");
  });

  it("strips borders", () => {
    const input = "╔══════╗\n║ Text ║\n╚══════╝";
    expect(stripMarkdown(input)).toBe("Text");
  });

  it("strips specific emojis", () => {
    const input = "Action required ⚠️. Progress 📈. Done ✅.";
    expect(stripMarkdown(input)).toBe("Action required . Progress . Done .");
  });

  it("handles a complex combination", () => {
    const input = `
# Summary
**User** is [LEARN: owner].
Check [this](http://link.com) ⚠️.
\`\`\`json
{"id": 1}
\`\`\`
    `;
    const result = stripMarkdown(input);
    expect(result).toContain("Summary");
    expect(result).toContain("User is");
    expect(result).toContain("Check this");
    expect(result).not.toContain("#");
    expect(result).not.toContain("**");
    expect(result).not.toContain("[LEARN:");
    expect(result).not.toContain("http");
    expect(result).not.toContain("⚠️");
    expect(result).not.toContain("```json");
  });
});
