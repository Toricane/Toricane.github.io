import { defineConfig } from "tsup"
import type { Plugin } from "esbuild"
import path from "node:path"

const inlineResources: Plugin = {
  name: "portfolio-inline-resources",
  setup(build) {
    build.onLoad({ filter: /\.scss$/ }, async (args) => {
      const sass = await import("sass")
      return { contents: sass.compile(args.path).css, loader: "text" }
    })

    build.onLoad({ filter: /\.inline\.ts$/ }, async (args) => {
      const esbuild = await import("esbuild")
      const fs = await import("node:fs/promises")
      const source = await fs.readFile(args.path, "utf8")
      const result = await esbuild.build({
        stdin: {
          contents: source,
          loader: "ts",
          resolveDir: path.dirname(args.path),
          sourcefile: args.path,
        },
        write: false,
        bundle: true,
        minify: true,
        platform: "browser",
        format: "esm",
        target: "es2020",
      })
      return { contents: result.outputFiles[0].text, loader: "text" }
    })
  },
}

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "components/index": "src/components/index.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  treeshake: true,
  target: "es2022",
  outDir: "dist",
  platform: "node",
  noExternal: [/.*/],
  // sharp is a native module (also used by @quartz-community/og-image) — never bundle it.
  external: ["preact", "preact/*", "sharp"],
  esbuildOptions(options) {
    options.jsx = "automatic"
    options.jsxImportSource = "preact"
  },
  esbuildPlugins: [inlineResources],
})
