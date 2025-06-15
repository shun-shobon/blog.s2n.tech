import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
	vite: {
		plugins: [tailwindcss()],
	},
	integrations: [mdx()],
});
