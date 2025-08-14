import type { APIRoute } from "astro";
import { normalizeURL } from "ufo";
import { z } from "zod";

const CACHE_KEY = "open-graph";
// 1 week
const EXPIRATION_TTL = 60 * 60 * 24 * 7;

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

export const GET: APIRoute = async ({ request, locals }) => {
	const searchParams = new URL(request.url).searchParams;
	const parsed = searchParamsSchema.safeParse(
		Object.fromEntries(searchParams.entries()),
	);
	if (!parsed.success) {
		return new Response("Bad Request", { status: 400 });
	}
	const { url } = parsed.data;
	const normalizedURL = normalizeURL(url);

	const cache = locals.runtime.env.CACHE;
	const cacheKey = `${CACHE_KEY}:${await getURLHash(normalizedURL)}`;

	const cached = await cache.get(cacheKey, { type: "json"});
	if (cached) {
		return new Response(JSON.stringify(cached), {
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "public, max-age=600, stale-while-revalidate=600",
			},
		});
	}

	const result = await extractOpenGraph(normalizedURL).catch((): OpenGraph => ({}));
	await cache.put(cacheKey, JSON.stringify(result), {
		expirationTtl: EXPIRATION_TTL,
	});

	if (result.ogImage) {
		const image = await getOGImage(result.ogImage);
		if (image) {
			await cache.put(`${cacheKey}:image`, image, {
				expirationTtl: EXPIRATION_TTL,
			});
		}
	}

	return new Response(JSON.stringify(result), {
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "public, max-age=600, stale-while-revalidate=600",
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
				case "og:image:url":
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

async function getOGImage(url: string): Promise<ArrayBuffer | null> {
	const response = await fetch(url);
	if (!response.ok) {
		return null;
	}

	return await response.arrayBuffer();
}

async function getURLHash(url: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(url);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
	return hashHex;
}
