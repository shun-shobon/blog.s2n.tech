import type { APIRoute } from "astro";
import { z } from "zod";

export const prerender = false;

export interface OpenGraph {
	title?: string;
	description?: string;
	ogTitle?: string;
	ogDescription?: string;
	ogImage?: string;
	twitterCard?: string;
}

const searchParamsSchema = z.object({
	url: z.url(),
});

export const GET: APIRoute = async ({ request }) => {
	const searchParams = new URL(request.url).searchParams;
	const parsed = searchParamsSchema.safeParse(
		Object.fromEntries(searchParams.entries()),
	);
	if (!parsed.success) {
		return new Response("Bad Request", { status: 400 });
	}

	const { url } = parsed.data;

	const result = await extractOpenGraph(url).catch((): OpenGraph => ({}));

	return new Response(JSON.stringify(result), {
		headers: {
			"Content-Type": "application/json",
		},
	});
};

async function extractOpenGraph(url: string): Promise<OpenGraph> {
	const result: OpenGraph = {};
	const handleTitle = {
		text(text: TextLike) {
			if (text.text) {
				result.title = text.text;
			}
		},
	};
	const handleMeta = {
		element(el: ElementLike) {
			const name = el.getAttribute("name");
			const property = el.getAttribute("property");
			const content = el.getAttribute("content");

			const propertyNormalized = name?.toLowerCase() ?? property?.toLowerCase();

			if (!propertyNormalized || !content) return;
			switch (propertyNormalized) {
				case "description":
					result.description = content;
					break;
				case "og:title":
					result.ogTitle = content;
					break;
				case "og:description":
					result.ogDescription = content;
					break;
				case "og:image":
				case "og:image:src":
					result.ogImage = content;
					break;
				case "twitter:card":
					result.twitterCard = content;
					break;
			}
		},
	};

	const response = await fetch(url);
	if (import.meta.env.DEV) {
		const { HTMLRewriter } = await import("html-rewriter-wasm");
		const rewriter = new HTMLRewriter(() => {/* noop */})
			.on("title", handleTitle)
			.on("meta", handleMeta)
    try {
      await rewriter.write(new Uint8Array(await response.arrayBuffer()));
      await rewriter.end();
    } finally {
      rewriter.free();
    }
	} else {
		const rewriter = new HTMLRewriter()
			.on("title", handleTitle)
			.on("meta", handleMeta)
		const transformed = rewriter.transform(response);
		await transformed.text();
	}

	return result;
}

interface ElementLike {
  getAttribute(name: string): string | null;
}

interface TextLike {
  text: string | null;
}
