import type { APIRoute } from "astro";

import { logger } from "@/libs/logger";

import { CACHE_BROWSER_TTL, CACHE_CDN_TTL } from "./_internal/constants";

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
	const searchParams = new URL(request.url).searchParams;
	const targetURL = searchParams.get("url");
	if (!targetURL) {
		logger.warn("url is not provided");
		return new Response("Bad Request", { status: 400 });
	}

	logger.info("getting open graph image", { url: targetURL });

	// 開発環境ではキャッシュを使わない
	if (!import.meta.env.DEV) {
		const cachedResponse = await caches.default.match(request);
		if (cachedResponse) {
			logger.info("cache hit", { url: targetURL });
			return cachedResponse;
		}
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

		const optimizedResponse = await optimizeImage(
			targetResponse,
			locals.runtime.env,
		);
		logger.info("optimized image", { url: targetURL });
		const response = new Response(optimizedResponse.body, {
			headers: {
				"Cache-Control": `public, s-maxage=${CACHE_CDN_TTL}, max-age=${CACHE_BROWSER_TTL}`,
			},
		});
		locals.runtime.ctx.waitUntil(caches.default.put(request, response));
		return response;
	} catch (error) {
		logger.error("Failed to optimize image", { url: targetURL, error });
		return new Response("Internal Server Error", { status: 500 });
	}
};

export async function optimizeImage(
	response: Response,
	env: Env,
): Promise<Response> {
	if (import.meta.env.DEV) {
		return response;
	}

	if (!response.body) {
		return new Response("Bad Request", { status: 400 });
	}

	const transformed = await env.IMAGE.input(response.body)
		.transform({
			height: 128,
		})
		.output({
			format: "image/webp",
		});

	return transformed.response();
}
