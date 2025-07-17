import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";

export default defineConfig({
	vite: {
		plugins: [tailwindcss()],
	},
	integrations: [mdx()],
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
