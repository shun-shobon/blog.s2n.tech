import type { APIRoute } from "astro";

import { cachedFetch } from "@/libs/cached-fetch";

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
		return targetResponse;
	}

	return new Response(targetResponse.body, {
		headers: {
			"Cache-Control": `public, s-maxage=${CACHE_CDN_TTL}, max-age=${CACHE_BROWSER_TTL}`,
		},
	});
};
