import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import partytown from "@astrojs/partytown";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField, fontProviders } from "astro/config";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import rehypeKatex from "rehype-katex";
import remarkCjkFriendly from "remark-cjk-friendly";
import remarkGfmStrikethroughCjkFriendly from "remark-cjk-friendly-gfm-strikethrough";
import remarkJoinCjkLines from "remark-join-cjk-lines";
import remarkMath from "remark-math";

export default defineConfig({
	site: "https://blog.s2n.tech",
	adapter: cloudflare({
		platformProxy: {
			enabled: true,
		},
		imageService: "compile",
	}),
	integrations: [
		expressiveCode({
			themes: "material-theme-lighter",
			styleOverrides: {
				frames: {
					frameBoxShadowCssValue: "none",
				},
			},
		}),
		mdx(),
		icon({
			include: {
				"simple-icons": ["github", "x"],
				"lucide": ["info", "triangle-alert", "octagon-x"],
			},
		}),
		sitemap(),
		partytown({
			forward: ["dataLayer.push"],
		}),
	],
	markdown: {
		shikiConfig: {
			theme: "material-theme-lighter",
		},
		remarkRehype: {
			footnoteLabel: "注釈",
			footnoteBackLabel: "戻る",
			footnoteBackContent: "↩\u{FE0E}",
		},
		remarkPlugins: [
			remarkMath,
			remarkJoinCjkLines,
			remarkCjkFriendly,
			remarkGfmStrikethroughCjkFriendly,
		],
		rehypePlugins: [[rehypeKatex, { strict: false, output: "mathml" }]],
	},
	env: {
		schema: {
			GOOGLE_ANALYTICS_ID: envField.string({
				context: "client",
				access: "public",
				optional: true,
			}),
		},
	},
	vite: {
		plugins: [tailwindcss()],
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
