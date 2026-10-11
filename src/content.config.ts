import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

const posts = defineCollection({
	loader: glob({
		pattern: "**/README.mdx",
		base: "./posts",
		generateId(options) {
			// entry → 2025-12-25-slug/README.mdx
			const matched =
				/^(?<date>\d{4}-\d{2}-\d{2})-(?<slug>.*?)\/README\.mdx$/iu.exec(
					options.entry,
				);
			if (!matched) {
				throw new Error("Invalid Match");
			}
			const { date, slug } = matched.groups!;
			if (!Number.isNaN(new Date(date!).getTime())) {
				options.data.publishedAt = date;
			}

			return slug!;
		},
	}),
	schema: z.object({
		title: z.string(),
		tags: z.string().array(),
		publishedAt: z.iso.date().optional(),
		updatedAt: z.iso.date().optional(),
	}),
});

export const collections = { posts };
