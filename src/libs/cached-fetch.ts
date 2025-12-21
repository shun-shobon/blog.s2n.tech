import { logger } from "./logger";

// 何故かworker-configuration.d.tsのCacheStorageが読み込まれないため、型を追加
declare global {
	interface CacheStorage {
		default: CacheStorage;
		put(request: Request, response: Response): Promise<void>;
	}
}

export async function cachedFetch(
	request: Request,
	ttl: number,
	ctx: Pick<ExecutionContext, "waitUntil">,
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
	newResponse.headers.set("Cache-Control", `public, s-maxage=${ttl}`);
	ctx.waitUntil(caches.default.put(request, newResponse));

	return response;
}
