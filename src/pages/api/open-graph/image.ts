import type { APIRoute } from "astro";

import { cachedFetch } from "@/libs/cached-fetch";

import { CACHE_BROWSER_TTL, CACHE_CDN_TTL } from "./_internal/constants";

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
	const searchParams = new URL(request.url).searchParams;
	const targetURL = searchParams.get("url");
	if (!targetURL) {
		return new Response("Bad Request", { status: 400 });
	}

	const targetRequest = new Request(targetURL, {
		cf: {
			image: {
				height: 128,
				format: "webp",
			},
		},
	});
	const targetResponse = await cachedFetch(
		targetRequest,
		CACHE_CDN_TTL,
		locals.runtime.ctx,
	);
	if (!targetResponse.ok) {
		return targetResponse;
	}

	// レスポンスヘッダーを書き換えて、強制的にキャッシュを行う
	const clonedResponse = targetResponse.clone();
	const newResponse = new Response(clonedResponse.body, clonedResponse);
	newResponse.headers.set(
		"Cache-Control",
		`public, s-maxage=${CACHE_CDN_TTL}, max-age=${CACHE_BROWSER_TTL}`,
	);
	return newResponse;
};
