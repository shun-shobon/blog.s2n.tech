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
	image: z.coerce.boolean().default(false),
});

export const GET: APIRoute = async ({ request, locals }) => {
	const searchParams = new URL(request.url).searchParams;
	const parsed = searchParamsSchema.safeParse(
		Object.fromEntries(searchParams.entries()),
	);
	if (!parsed.success) {
		return new Response("Bad Request", { status: 400 });
	}
	const { url, image: shouldImage } = parsed.data;
	const normalizedURL = normalizeURL(url);

	const cache = locals.runtime.env.CACHE;
	const cacheKey = `${CACHE_KEY}:${await getURLHash(normalizedURL)}`;

	const cached = await cache.get(cacheKey, "json");
	const cachedImage = await cache.getWithMetadata<{ contentType: string }>(
		`${cacheKey}:image`,
		"arrayBuffer",
	);
	if (!shouldImage && cached) {
		return new Response(JSON.stringify(cached), {
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "public, max-age=600, stale-while-revalidate=600",
			},
		});
	} else if (shouldImage && cachedImage.value && cachedImage.metadata) {
		return new Response(cachedImage.value, {
			headers: {
				"Content-Type": cachedImage.metadata.contentType,
				"Cache-Control": "public, max-age=600, stale-while-revalidate=600",
			},
		});
	}

	const result = await extractOpenGraph(normalizedURL).catch(() => null);
	if (result == null) {
		return new Response("Not found", { status: 404 });
	}
	const ogImage = result.ogImage ? await getOGImage(result.ogImage) : null;

	await cache.put(cacheKey, JSON.stringify(result), {
		expirationTtl: EXPIRATION_TTL,
	});
	if (ogImage) {
		await cache.put(`${cacheKey}:image`, ogImage.data, {
			metadata: {
				contentType: ogImage.contentType,
			},
			expirationTtl: EXPIRATION_TTL,
		});
	}

	if (shouldImage && ogImage) {
		return new Response(ogImage.data, {
			headers: {
				"Content-Type": ogImage.contentType,
			},
		});
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
		const rewriter = new HTMLRewriter(() => {
			// noop
		})
			.on("title", handleTitle)
			.on("meta", handleMeta);
		try {
			await rewriter.write(new Uint8Array(await response.arrayBuffer()));
			await rewriter.end();
		} finally {
			rewriter.free();
		}
	} else {
		const rewriter = new HTMLRewriter()
			.on("title", handleTitle)
			.on("meta", handleMeta);
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

async function getOGImage(
	url: string,
): Promise<{ contentType: string; data: ArrayBuffer } | null> {
	const response = await fetch(url);
	if (!response.ok) {
		return null;
	}

	const contentType = response.headers.get("content-type") ?? "image/png";
	const data = await response.arrayBuffer();

	return { contentType, data };
}

async function getURLHash(url: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(url);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return hashHex;
}
