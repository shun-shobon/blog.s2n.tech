import type { APIRoute } from "astro";

import { CACHE_BROWSER_TTL, CACHE_CDN_TTL } from "./_internal/constants";
import { extractOpenGraph } from "./_internal/extract";

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
