import type { APIRoute } from "astro";
import { decodeHTMLStrict } from "entities/decode";

import { CACHE_BROWSER_TTL, CACHE_CDN_TTL } from "./_internal/constants";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
	const searchParams = new URL(request.url).searchParams;
	const targetURL = searchParams.get("url");
	if (!targetURL) {
		return new Response("Bad Request", { status: 400 });
	}

	const targetRequest = new Request(targetURL);
	const targetResponse = await fetch(targetRequest);
	if (!targetResponse.ok) {
		return new Response("Not Found", { status: 404 });
	}

	const openGraphData = await extractOpenGraph(targetResponse);

	return Response.json(openGraphData, {
		headers: {
			"Cache-Control": `public, s-maxage=${CACHE_CDN_TTL}, max-age=${CACHE_BROWSER_TTL}`,
		},
	});
};

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

	const handleTitle = {
		text(text: TextLike) {
			if (text.text?.trim() && result.title == null) {
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
				result[targetProperty] = decodeHTMLStrict(content.trim());
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
