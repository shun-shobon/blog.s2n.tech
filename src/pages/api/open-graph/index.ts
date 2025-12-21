import type { APIRoute } from "astro";
import { normalizeURL } from "ufo";

import { logger } from "@/libs/logger";

import { extractOpenGraph } from "./_internal/extract";

export const prerender = false;

const CACHE_S_MAX_AGE = 60 * 60 * 24 * 7; // 1週間
const CACHE_MAX_AGE = 60 * 60; // 1時間

export const GET: APIRoute = async ({ request, locals }) => {
	const searchParams = new URL(request.url).searchParams;
	const targetURL = searchParams.get("url");
	if (!targetURL) {
		return new Response("Bad Request", { status: 400 });
	}

	const normalizedTargetURL = normalizeURL(targetURL);
	const targetRequest = new Request(normalizedTargetURL);
	const targetResponse = await cachedFetch(targetRequest, locals);
	if (!targetResponse.ok) {
		return new Response("Not Found", { status: 404 });
	}

	const openGraphData = await extractOpenGraph(targetResponse);

	return Response.json(openGraphData, {
		headers: {
			"Cache-Control": `public, s-maxage=${CACHE_S_MAX_AGE}, max-age=${CACHE_MAX_AGE}`,
		},
	});
};

// 何故かworker-configuration.d.tsのCacheStorageが読み込まれないため、型を追加
declare global {
	interface CacheStorage {
		default: CacheStorage;
		put(request: Request, response: Response): Promise<void>;
	}
}

async function cachedFetch(
	request: Request,
	locals: App.Locals,
): Promise<Response> {
	// 開発環境ではキャッシュが使えないので、fetchをそのまま返す
	if (import.meta.env.DEV) {
		return await fetch(request);
	}

	const cachedResponse = await caches.default.match(request);
	if (cachedResponse) {
		logger.info("cache hit", { url: request.url });
		return cachedResponse;
	}

	const response = await fetch(request);
	// 失敗の場合はキャッシュしない
	if (!response.ok) {
		return response;
	}

	// レスポンスヘッダーを書き換えて、強制的にキャッシュを行う
	const clonedResponse = response.clone();
	const newResponse = new Response(clonedResponse.body, clonedResponse);
	newResponse.headers.set("Cache-Control", `public, s-maxage=${CACHE_MAX_AGE}`);
	locals.runtime.ctx.waitUntil(caches.default.put(request, newResponse));

	return response;
}
