import type { APIRoute } from "astro";
import { decodeHTMLStrict } from "entities/decode";

import { logger } from "@/libs/logger";

import { CACHE_BROWSER_TTL, CACHE_CDN_TTL } from "./_internal/constants";
import { getURLHash } from "./_internal/utils";

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
	const searchParams = new URL(request.url).searchParams;
	const targetURL = searchParams.get("url");
	if (!targetURL) {
		logger.warn("url is not provided");
		return new Response("Bad Request", { status: 400 });
	}

	logger.info("getting open graph data", { url: targetURL });

	const cacheKey = await getCacheKey(targetURL);
	const cached = await locals.runtime.env.CACHE.get(cacheKey, "json");
	if (cached) {
		logger.info("cache hit", { url: targetURL });
		return Response.json(cached, {
			headers: {
				"Cache-Control": `public, max-age=${CACHE_BROWSER_TTL}`,
			},
		});
	}

	logger.info("cache miss", { url: targetURL });
	try {
		const targetRequest = new Request(targetURL);
		const targetResponse = await fetch(targetRequest);
		if (!targetResponse.ok) {
			logger.warn("request failed", {
				url: targetURL,
				status: targetResponse.status,
			});
			return new Response("Not Found", { status: 404 });
		}

		const openGraphData = await extractOpenGraph(targetResponse);
		logger.info("extracted open graph data", {
			url: targetURL,
			data: openGraphData,
		});
		locals.runtime.ctx.waitUntil(
			locals.runtime.env.CACHE.put(cacheKey, JSON.stringify(openGraphData), {
				expirationTtl: CACHE_CDN_TTL,
			}),
		);
		return Response.json(openGraphData, {
			headers: {
				"Cache-Control": `public, max-age=${CACHE_BROWSER_TTL}`,
			},
		});
	} catch (error) {
		logger.error("Failed to extract OpenGraph data", { url: targetURL, error });
		return new Response("Internal Server Error", { status: 500 });
	}
};

export async function getCacheKey(url: string): Promise<string> {
	return `open-graph:${await getURLHash(url)}`;
}

export interface OpenGraphData {
	title?: string;
	description?: string;
	ogTitle?: string;
	ogDescription?: string;
	ogImage?: string;
	twitterCard?: string;
}

export async function extractOpenGraph(
	response: Response,
): Promise<OpenGraphData> {
	const result: OpenGraphData = {};

	logger.info("extracting open graph data", { url: response.url });

	const handleTitle = {
		text(text: TextLike) {
			if (text.text?.trim() && result.title == null) {
				const trimmedText = text.text.trim();
				logger.info("extracted title", { title: trimmedText });
				result.title = trimmedText;
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

			// メタデータをOpenGraphのプロパティにマッピング
			const metadataMap: Record<string, keyof OpenGraphData> = {
				"description": "description",
				"og:title": "ogTitle",
				"og:description": "ogDescription",
				"og:image": "ogImage",
				"og:image:url": "ogImage",
				"twitter:card": "twitterCard",
			};

			const targetProperty = metadataMap[propertyKey];
			if (targetProperty) {
				const trimmedContent = content.trim();
				logger.info("found metadata", {
					property: targetProperty,
					content: trimmedContent,
				});
				result[targetProperty] = decodeHTMLStrict(trimmedContent);
			}
		},
	};

	if (import.meta.env.DEV) {
		// 開発環境ではWASM版のHTMLRewriterを使用
		const { HTMLRewriter } = await import("html-rewriter-wasm");
		const rewriter = new HTMLRewriter(() => {
			/* noop */
		})
			.on("head title", handleTitle)
			.on("head meta", handleMeta);

		try {
			const buffer = new Uint8Array(await response.arrayBuffer());
			await rewriter.write(buffer);
			await rewriter.end();
		} finally {
			rewriter.free();
		}
	} else {
		// 本番環境ではCloudflare版のHTMLRewriterを使用
		const rewriter = new HTMLRewriter()
			.on("head title", handleTitle)
			.on("head meta", handleMeta);

		const transformed = rewriter.transform(response);
		await consume(transformed.body!);
	}

	return result;
}

interface ElementLike {
	getAttribute(name: string): string | null;
}

interface TextLike {
	text: string | null;
}

async function consume(stream: ReadableStream) {
	const reader = stream.getReader();
	let result = await reader.read();
	while (!result.done) {
		result = await reader.read();
	}
}
