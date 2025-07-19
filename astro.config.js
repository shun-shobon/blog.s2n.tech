import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";
import icon from "astro-icon";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

export default defineConfig({
	vite: {
		plugins: [tailwindcss()],
	},
	integrations: [
		mdx(),
		icon({
			include: {
				"simple-icons": ["github", "x"],
			},
		}),
	],
	markdown: {
		shikiConfig: {
			theme: "material-theme-lighter",
		},
		remarkRehype: {
			footnoteLabel: "注釈",
		},
		remarkPlugins: [remarkMath],
		rehypePlugins: [[rehypeKatex, { strict: false, output: "mathml" }]],
	},
	experimental: {
		fonts: [
			{
				provider: fontProviders.google(),
				name: "Caveat",
				cssVariable: "--font-family-caveat",
				weights: [400, 700],
				subsets: ["latin"],
				styles: ["normal"],
				fallbacks: [],
			},
		],
	},
});
