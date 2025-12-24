import rss from "@astrojs/rss";
import type { APIRoute } from "astro";

import { getPosts, postToSlug } from "@/libs/posts";

export const GET: APIRoute = async ({ site }) => {
	const { posts } = await getPosts({ draft: import.meta.env.DEV });

	return await rss({
		title: "blog.s2n.tech",
		description:
			"@shun_shobonのブログです。フロントエンドを中心に、様々な話題について好き勝手に書いています。",
		site: site!,
		items: posts.map((post) => ({
			title: post.data.title,
			link: new URL(`/posts/${postToSlug(post)}`, site!.origin).href,
			pubDate: post.data.publishedAt
				? new Date(post.data.publishedAt)
				: undefined,
		})),
	});
};
