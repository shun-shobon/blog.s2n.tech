import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const posts = defineCollection({
	loader: glob({ pattern: "**/README.mdx", base: "./posts" }),
	schema: z.object({
		title: z.string(),
		tags: z.string().array(),
		publishedAt: z.string().date().optional(),
		updatedAt: z.string().date().optional(),
	}),
});

export const collections = { posts };
