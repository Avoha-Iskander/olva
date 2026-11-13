import { describe, expect, it } from "vitest";

import {
  checkImportFile,
  errorText,
  extensionOf,
  originalUploadPlan,
  rejectedFilesMessage,
  STORED_PHOTO_MAX_BYTES,
} from "@/lib/import-files";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const TEXT = new TextEncoder().encode("Bonjour, ceci est un texte");

describe("extensionOf", () => {
  it("renvoie l'extension en minuscules, ou rien", () => {
    expect(extensionOf("Capture.PNG")).toBe("png");
    expect(extensionOf("photo.recette.jpeg")).toBe("jpeg");
    expect(extensionOf("sans-extension")).toBe("");
    expect(extensionOf(".cache")).toBe("");
  });
});

describe("checkImportFile", () => {
  it("accepte un fichier annoncé comme image", () => {
    expect(checkImportFile({ name: "a.jpg", type: "image/jpeg" }, TEXT)).toEqual({ ok: true });
  });

  it("accepte une capture d'écran au type VIDE, reconnue à ses octets (cas Android 10)", () => {
    expect(checkImportFile({ name: "Screenshot_2026", type: "" }, PNG)).toEqual({ ok: true });
  });

  it("accepte un fichier au type vide nommé comme une image (la compression tranchera)", () => {
    expect(checkImportFile({ name: "IMG_1234.HEIC", type: "" }, TEXT)).toEqual({ ok: true });
  });

  it("écarte un fichier qui n'est pas une image, avec une raison explicite", () => {
    expect(checkImportFile({ name: "notes.txt", type: "text/plain" }, TEXT)).toEqual({
      ok: false,
      reason: "Fichier écarté : type « text/plain », nom .txt",
    });
    expect(checkImportFile({ name: "fichier", type: "" }, TEXT)).toEqual({
      ok: false,
      reason: "Fichier écarté : type vide, nom sans extension",
    });
  });
});

describe("rejectedFilesMessage", () => {
  it("accorde le message au nombre de fichiers", () => {
    expect(rejectedFilesMessage(1)).toMatch(/^Ce fichier n'a pas été reconnu/);
    expect(rejectedFilesMessage(2)).toMatch(/^2 fichiers n'ont pas été reconnus/);
  });
});

describe("originalUploadPlan (compression échouée)", () => {
  it("envoie un PNG d'origine avec le bon type et la bonne extension", () => {
    expect(originalUploadPlan(PNG, 900_000)).toEqual({
      ok: true,
      contentType: "image/png",
      extension: "png",
    });
    expect(originalUploadPlan(JPEG, 900_000)).toMatchObject({
      contentType: "image/jpeg",
      extension: "jpg",
    });
  });

  it("refuse un format que le stockage n'accepte pas", () => {
    expect(originalUploadPlan(TEXT, 900_000)).toEqual({
      ok: false,
      reason: "format non pris en charge (ni JPEG, ni PNG, ni WebP)",
    });
  });

  it("refuse un fichier trop lourd pour le stockage", () => {
    expect(originalUploadPlan(PNG, STORED_PHOTO_MAX_BYTES + 1)).toEqual({
      ok: false,
      reason: "trop lourd (5,0 Mo, 5 Mo au plus)",
    });
  });
});

describe("errorText", () => {
  it("donne le message d'une erreur, ou un texte de secours", () => {
    expect(errorText(new Error("Worker introuvable"))).toBe("Worker introuvable");
    expect(errorText(new Error(""))).toBe("erreur inconnue");
    expect(errorText("échec")).toBe("échec");
  });
});
