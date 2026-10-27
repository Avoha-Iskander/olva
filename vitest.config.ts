import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Configuration des tests.
// L'alias "@" permet d'écrire les mêmes imports que dans l'app (ex. "@/lib/servings").
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
