import type { APIRoute } from "astro";

import { generateImage } from "@/libs/og-image";
import { getPost, getPosts } from "@/libs/posts";

export const GET: APIRoute = async ({ params }) => {
	const { slug } = params;
	if (slug == null) {
		return new Response("Not found", { status: 404 });
	}

	const post = await getPost(slug);
	if (post == null) {
		return new Response("Not found", { status: 404 });
	}

	const image = await generateImage({
		title: post.data.title,
		tags: post.data.tags,
	});

	return new Response(image, {
		headers: { "Content-Type": "image/png" },
	});
};

export async function getStaticPaths() {
	const { posts } = await getPosts({
		draft: import.meta.env.DEV,
	});

	return posts.map((post) => ({
		params: { slug: post.id },
	}));
}
