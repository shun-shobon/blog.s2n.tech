import type { APIRoute } from "astro";

import { logger } from "@/libs/logger";

import { CACHE_BROWSER_TTL, CACHE_CDN_TTL } from "./_internal/constants";
import { getURLHash } from "./_internal/utils";

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
	const searchParams = new URL(request.url).searchParams;
	const targetURL = searchParams.get("url");
	if (!targetURL) {
		return new Response("Bad Request", { status: 400 });
	}

	const cacheKey = await getCacheKey(targetURL);
	const cached = await locals.runtime.env.CACHE.get(cacheKey, "stream");
	if (cached) {
		return new Response(cached, {
			headers: {
				"Content-Type": "image/webp",
				"Cache-Control": `public, max-age=${CACHE_BROWSER_TTL}`,
			},
		});
	}

	try {
		const targetRequest = new Request(targetURL);
		const targetResponse = await fetch(targetRequest);
		if (!targetResponse.ok) {
			return new Response("Not Found", { status: 404 });
		}

		const optimizedResponse = await optimizeImage(
			targetResponse,
			locals.runtime.env,
		);
		locals.runtime.ctx.waitUntil(
			locals.runtime.env.CACHE.put(cacheKey, optimizedResponse.clone().body!, {
				expirationTtl: CACHE_CDN_TTL,
			}),
		);
		return new Response(optimizedResponse.body, {
			headers: {
				"Cache-Control": `public, max-age=${CACHE_BROWSER_TTL}`,
			},
		});
	} catch (error) {
		logger.error("Failed to optimize image", { url: targetURL, error });
		return new Response("Internal Server Error", { status: 500 });
	}
};

export async function getCacheKey(url: string): Promise<string> {
	return `open-graph-image:${await getURLHash(url)}`;
}

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
