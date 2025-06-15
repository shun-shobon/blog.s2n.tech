import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const posts = defineCollection({
	loader: glob({ pattern: "*.mdx", base: "./posts" }),
	schema: z.object({
		title: z.string(),
		publishedAt: z.string().datetime().optional(),
		updatedAt: z.string().datetime().optional(),
	}),
});

export const collections = { posts };
