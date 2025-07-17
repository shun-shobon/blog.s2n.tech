import type { CollectionEntry } from "astro:content";
import { getCollection, getEntry } from "astro:content";

export type Post = CollectionEntry<"posts">;

export interface GetPostsOptions {
	tag?: string;
	draft?: boolean;
}

export interface GetPostsResult {
	posts: Post[];
	total: number;
}

export async function getPosts({
	tag,
	draft = false,
}: GetPostsOptions): Promise<GetPostsResult> {
	const posts = await getCollection("posts", (post) => {
		if (!draft && !post.data.publishedAt) {
			return false;
		}

		if (tag) {
			return post.data.tags.includes(tag);
		}

		return true;
	});

	posts.sort((a, b) => {
		if (!a.data.publishedAt && !b.data.publishedAt) {
			return 0;
		}
		if (!a.data.publishedAt) {
			return -1;
		}
		if (!b.data.publishedAt) {
			return 1;
		}

		const aDate = new Date(a.data.publishedAt);
		const bDate = new Date(b.data.publishedAt);
		return bDate.getTime() - aDate.getTime();
	});

	return { posts, total: posts.length };
}

export async function getPost(id: string): Promise<Post | null> {
	const slug = `${id}/readme`;
	const post = await getEntry("posts", slug);

	if (!post) {
		return null;
	}

	return post;
}

export async function getTags(): Promise<string[]> {
	const { posts } = await getPosts({
		draft: true,
	});

	const tagMap = new Map<string, number>();
	for (const post of posts) {
		for (const tag of post.data.tags) {
			tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
		}
	}

	const tags = Array.from(tagMap.entries()).sort((a, b) => b[1] - a[1]);

	return tags.map(([tag]) => tag);
}
