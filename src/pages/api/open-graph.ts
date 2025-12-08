import type { APIRoute } from "astro";
import { decodeHTMLStrict } from "entities/decode";
import { normalizeURL, withQuery } from "ufo";
import { z } from "zod";

// Configuration
export const prerender = false;

// Cache Configuration
const CACHE_CONFIG = {
	KEY_PREFIX: "open-graph",
	EXPIRATION_TTL: 60 * 60 * 24 * 7, // 1 week
	BROWSER_MAX_AGE: 600, // 10 minutes
	STALE_WHILE_REVALIDATE: 600, // 10 minutes
} as const;

// Response Headers
const RESPONSE_HEADERS = {
	CACHE_CONTROL: `public, max-age=${CACHE_CONFIG.BROWSER_MAX_AGE}, stale-while-revalidate=${CACHE_CONFIG.STALE_WHILE_REVALIDATE}`,
	CONTENT_TYPE_JSON: "application/json",
} as const;

/**
 * OpenGraph metadata extracted from a webpage
 */
export interface OpenGraph {
	/**
	 * Page title from <title> tag
	 */
	title?: string;
	/**
	 * Page description from meta description
	 */
	description?: string;
	/**
	 * OpenGraph title
	 */
	ogTitle?: string;
	/**
	 * OpenGraph description
	 */
	ogDescription?: string;
	/**
	 * OpenGraph image URL
	 */
	ogImage?: string;
	/**
	 * Twitter card type
	 */
	twitterCard?: string;
}

/**
 * Image data with content type
 */
interface ImageData {
	contentType: string;
	data: ReadableStream;
}

/**
 * Schema for validating query parameters
 */
const searchParamsSchema = z.object({
	url: z.url(),
	image: z.coerce.boolean().default(false),
});

export const GET: APIRoute = async ({ request, locals }) => {
	// Validate request parameters
	const validation = validateRequestParams(request);
	if (!validation.success) {
		return createErrorResponse("Bad Request", 400);
	}

	const { url, image: shouldReturnImage } = validation.data;
	const normalizedURL = normalizeURL(url);
	const cache = locals.runtime.env.CACHE;

	// Generate cache keys
	const cacheKeys = await generateCacheKeys(normalizedURL);

	// Try to serve from cache
	const cachedResponse = await serveCachedResponse(
		cache,
		cacheKeys,
		shouldReturnImage,
	);
	if (cachedResponse) {
		return cachedResponse;
	}

	// Fetch and extract OpenGraph data
	const openGraphData = await extractOpenGraph(normalizedURL).catch(() => null);
	if (!openGraphData) {
		return createErrorResponse("Not found", 404);
	}

	// Fetch OG image if available
	const ogImage = openGraphData.ogImage
		? await fetchOGImage(openGraphData.ogImage)
		: null;

	if (ogImage) {
		openGraphData.ogImage = withQuery("/api/open-graph", {
			url: normalizedURL,
			image: "true",
		});
	}

	// Store in cache
	await storeCacheData(cache, cacheKeys, openGraphData, ogImage);

	// Return appropriate response
	if (shouldReturnImage && ogImage) {
		return createImageResponse(ogImage);
	}

	return createJSONResponse(openGraphData);
};

/**
 * Validates request parameters
 */
function validateRequestParams(request: Request) {
	const searchParams = new URL(request.url).searchParams;
	return searchParamsSchema.safeParse(
		Object.fromEntries(searchParams.entries()),
	);
}

/**
 * Generates cache keys for the given URL
 */
async function generateCacheKeys(url: string) {
	const hash = await getURLHash(url);
	return {
		data: `${CACHE_CONFIG.KEY_PREFIX}:${hash}`,
		image: `${CACHE_CONFIG.KEY_PREFIX}:${hash}:image`,
	};
}

/**
 * Attempts to serve cached response if available
 */
async function serveCachedResponse(
	cache: KVNamespace,
	cacheKeys: { data: string; image: string },
	shouldReturnImage: boolean,
): Promise<Response | null> {
	if (shouldReturnImage) {
		const cachedImage = await cache.getWithMetadata<{ contentType: string }>(
			cacheKeys.image,
			"stream",
		);
		if (cachedImage.value && cachedImage.metadata) {
			return createImageResponse({
				contentType: cachedImage.metadata.contentType,
				data: cachedImage.value,
			});
		}
	} else {
		const cachedData = await cache.get(cacheKeys.data, "json");
		if (cachedData) {
			return createJSONResponse(cachedData as OpenGraph);
		}
	}
	return null;
}

/**
 * Stores OpenGraph data and image in cache
 */
async function storeCacheData(
	cache: KVNamespace,
	cacheKeys: { data: string; image: string },
	openGraphData: OpenGraph,
	ogImage: ImageData | null,
): Promise<void> {
	// Store OpenGraph data
	await cache.put(cacheKeys.data, JSON.stringify(openGraphData), {
		expirationTtl: CACHE_CONFIG.EXPIRATION_TTL,
	});

	// Store image if available
	if (ogImage) {
		await cache.put(cacheKeys.image, ogImage.data, {
			metadata: { contentType: ogImage.contentType },
			expirationTtl: CACHE_CONFIG.EXPIRATION_TTL,
		});
	}
}

/**
 * Creates a JSON response with appropriate headers
 */
function createJSONResponse(data: OpenGraph): Response {
	return Response.json(data, {
		headers: {
			"Content-Type": RESPONSE_HEADERS.CONTENT_TYPE_JSON,
			"Cache-Control": RESPONSE_HEADERS.CACHE_CONTROL,
		},
	});
}

/**
 * Creates an image response with appropriate headers
 */
function createImageResponse(image: ImageData): Response {
	return new Response(image.data, {
		headers: {
			"Content-Type": image.contentType,
			"Cache-Control": RESPONSE_HEADERS.CACHE_CONTROL,
		},
	});
}

/**
 * Creates an error response
 */
function createErrorResponse(message: string, status: number): Response {
	return new Response(message, { status });
}

/**
 * Extracts OpenGraph metadata from a webpage
 */
async function extractOpenGraph(url: string): Promise<OpenGraph> {
	const result: OpenGraph = {};

	// Create handlers for HTML parsing
	const handlers = createHTMLHandlers(result);

	// Fetch the webpage
	const response = await fetch(url);

	if (!response.ok) {
		console.error(
			`Failed to fetch URL: ${response.status} ${await response.text()}`,
		);
		throw new Error(`Failed to fetch URL: ${response.status}`);
	}

	// Parse HTML with appropriate rewriter
	await parseHTMLWithRewriter(response, handlers);

	return result;
}

/**
 * Creates HTML handlers for extracting OpenGraph data
 */
function createHTMLHandlers(result: OpenGraph) {
	const handleTitle = {
		text(text: TextLike) {
			if (text.text?.trim()) {
				result.title = text.text.trim();
			}
		},
	};

	const handleMeta = {
		element(el: ElementLike) {
			const name = el.getAttribute("name");
			const property = el.getAttribute("property");
			const content = el.getAttribute("content");

			if (!content) return;

			const propertyKey = (name ?? property)?.toLowerCase();
			if (!propertyKey) return;

			// Map metadata to OpenGraph properties
			const metadataMap: Record<string, keyof OpenGraph> = {
				"description": "description",
				"og:title": "ogTitle",
				"og:description": "ogDescription",
				"og:image": "ogImage",
				"og:image:url": "ogImage",
				"twitter:card": "twitterCard",
			};

			const targetProperty = metadataMap[propertyKey];
			if (targetProperty) {
				result[targetProperty] = decodeHTMLStrict(content.trim());
			}
		},
	};

	return { handleTitle, handleMeta };
}

/**
 * Parses HTML with the appropriate rewriter based on environment
 */
async function parseHTMLWithRewriter(
	response: Response,
	handlers: {
		handleTitle: { text: (text: TextLike) => void };
		handleMeta: { element: (el: ElementLike) => void };
	},
): Promise<void> {
	if (import.meta.env.DEV) {
		// Use WASM HTMLRewriter in development
		const { HTMLRewriter } = await import("html-rewriter-wasm");
		const rewriter = new HTMLRewriter(() => {
			/* noop */
		})
			.on("title", handlers.handleTitle)
			.on("meta", handlers.handleMeta);

		try {
			const buffer = new Uint8Array(await response.arrayBuffer());
			await rewriter.write(buffer);
			await rewriter.end();
		} finally {
			rewriter.free();
		}
	} else {
		// Use Cloudflare HTMLRewriter in production
		const rewriter = new HTMLRewriter()
			.on("title", handlers.handleTitle)
			.on("meta", handlers.handleMeta);

		const transformed = rewriter.transform(response);
		await consume(transformed.body!);
	}
}

/**
 * Fetches an OpenGraph image from URL
 */
async function fetchOGImage(url: string): Promise<ImageData | null> {
	try {
		const response = await fetch(url);

		if (!response.ok) {
			console.error(
				`Failed to fetch OG image: ${response.status} ${await response.text()}`,
			);
			return null;
		}

		const contentType = response.headers.get("content-type");
		if (
			!contentType ||
			![
				"image/png",
				"image/jpeg",
				"image/gif",
				"image/webp",
				"image/avif",
			].includes(contentType)
		) {
			console.error("Invalid content type for OG image:", contentType);
			return null;
		}

		return { contentType, data: response.body! };
	} catch (error) {
		console.error("Error fetching OG image:", error);
		return null;
	}
}

// Type definitions for HTMLRewriter
interface ElementLike {
	getAttribute(name: string): string | null;
}

interface TextLike {
	text: string | null;
}

/**
 * Generates a SHA-256 hash of the URL for cache key generation
 */
async function getURLHash(url: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(url);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Consumes a stream
 */
async function consume(stream: ReadableStream) {
	const reader = stream.getReader();
	let result = await reader.read();
	while (!result.done) {
		result = await reader.read();
	}
}
