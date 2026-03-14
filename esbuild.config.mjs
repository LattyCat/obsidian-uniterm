import esbuild from "esbuild";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const production = process.argv[2] === "production";

/** Concatenate xterm.css + styles/terminal.css → styles.css */
function buildCssPlugin() {
  return {
    name: "build-css",
    setup(build) {
      build.onEnd(() => {
        const xtermCss = readFileSync(
          resolve(__dirname, "node_modules/@xterm/xterm/css/xterm.css"),
          "utf-8"
        );
        const pluginCss = readFileSync(
          resolve(__dirname, "styles/terminal.css"),
          "utf-8"
        );
        writeFileSync(
          resolve(__dirname, "styles.css"),
          xtermCss + "\n" + pluginCss
        );
        console.log("  styles.css <- xterm.css + styles/terminal.css");
      });
    },
  };
}

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "node-pty",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
  ],
  format: "cjs",
  target: "es2022",
  logLevel: "info",
  sourcemap: production ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: production,
  platform: "node",
  define: {
    "process.env.NODE_ENV": production ? '"production"' : '"development"',
  },
  plugins: [buildCssPlugin()],
});

if (production) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
