import { describe, expect, it } from "vitest";

import { detectImageType } from "@/lib/image-type";

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

describe("detectImageType", () => {
  it("reconnaît un JPEG", () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0))).toBe("image/jpeg");
  });

  it("reconnaît un PNG, même nommé .webp", () => {
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe(
      "image/png",
    );
  });

  it("reconnaît un WebP", () => {
    expect(detectImageType(bytes(...ascii("RIFF"), 1, 2, 3, 4, ...ascii("WEBPVP8 ")))).toBe(
      "image/webp",
    );
  });

  it("refuse un fichier qui n'est pas une image connue", () => {
    expect(detectImageType(bytes(...ascii("%PDF-1.7")))).toBeNull();
    expect(detectImageType(bytes())).toBeNull();
  });
});
