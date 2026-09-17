import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base path matches GitHub Pages project-site convention:
// https://mariamelfadaly.github.io/<repo-name>/
// Change "megalab-hub" below to whatever the deployed repo is named.
export default defineConfig({
  plugins: [react()],
base: "/megalab-hr-hub/",  
});
