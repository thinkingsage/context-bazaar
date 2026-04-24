import { defineConfig } from "rollup";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { codecovRollupPlugin } from "@codecov/rollup-plugin";

export default defineConfig({
  input: "src/cli.ts",
  output: { dir: "dist", format: "esm", sourcemap: true },
  external: [/node_modules/],
  plugins: [
    resolve(),
    typescript({ outDir: "dist", noEmit: false }),
    codecovRollupPlugin({
      enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
      bundleName: "skill-forge",
      uploadToken: process.env.CODECOV_TOKEN,
    }),
  ],
});
