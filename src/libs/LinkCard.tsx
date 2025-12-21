import type { Component } from "solid-js";
import { createMemo, createSignal, onMount, Show } from "solid-js";

import type { OpenGraphData } from "@/pages/api/open-graph";

interface Props {
	href: string;
}

export const LinkCard: Component<Props> = (props) => {
	const url = createMemo(() => new URL(props.href));
	const faviconURL = createMemo(() => {
		const faviconURL = new URL("https://t3.gstatic.com/faviconV2");
		faviconURL.searchParams.set("client", "SOCIAL");
		faviconURL.searchParams.set("type", "FAVICON");
		faviconURL.searchParams.set("fallback_opts", "TYPE,SIZE,URL");
		faviconURL.searchParams.set("url", url().origin);
		faviconURL.searchParams.set("size", "32");
		return faviconURL.toString();
	});

	const [openGraphData, setOpenGraphData] = createSignal<{
		data: OpenGraphData | null;
		isLoading: boolean;
	}>({ data: null, isLoading: true });

	// eslint-disable-next-line typescript/no-misused-promises
	onMount(async () => {
		try {
			const response = await fetch(
				`/api/open-graph?url=${encodeURIComponent(props.href)}`,
			);
			if (!response.ok) {
				throw new Error(
					`Failed to fetch open graph data: ${response.statusText}`,
				);
			}

			const data: OpenGraphData = await response.json();
			setOpenGraphData({ data, isLoading: false });
		} catch (error) {
			console.error("Failed to fetch open graph data", {
				url: props.href,
				error,
			});
			setOpenGraphData({ data: null, isLoading: false });
		}
	});

	const title = createMemo(() => {
		return (
			// eslint-disable-next-line typescript/prefer-nullish-coalescing
			openGraphData().data?.ogTitle ||
			// eslint-disable-next-line typescript/prefer-nullish-coalescing
			openGraphData().data?.title ||
			url().hostname
		);
	});

	const description = createMemo(() => {
		return (
			// eslint-disable-next-line typescript/prefer-nullish-coalescing
			openGraphData().data?.ogDescription || openGraphData().data?.description
		);
	});

	return (
		// eslint-disable-next-line jsx-a11y/control-has-associated-label
		<a
			href={props.href}
			target="_blank"
			rel="noopener noreferrer"
			class="not-markdown my-6 flex h-32 items-center overflow-hidden rounded-lg border border-border-secondary bg-background-primary transition-colors hover:bg-background-secondary"
		>
			<Show
				when={!openGraphData().isLoading}
				fallback={
					<div class="grid grow gap-1 p-4">
						<span class="link-card-placeholder w-full" />
						<span class="link-card-placeholder w-1/2 text-sm" />
						<span class="link-card-placeholder w-1/4 text-xs" />
					</div>
				}
			>
				<div class="grid grow gap-1 p-4">
					<span class="line-clamp-2 w-full leading-tight font-bold">
						{title()}
					</span>
					<Show when={description()}>
						<span class="line-clamp-2 text-sm leading-tight text-text-secondary">
							{description()}
						</span>
					</Show>
					<span class="flex min-w-0 items-center gap-1 text-xs text-text-secondary">
						<img
							src={faviconURL()}
							alt=""
							class="size-4 shrink-0"
							decoding="async"
							loading="lazy"
						/>
						<span class="overflow-hidden text-nowrap text-ellipsis">
							{url().hostname}
						</span>
					</span>
				</div>
				<Show when={openGraphData().data?.ogImage}>
					<img
						src={`/api/open-graph/image?url=${encodeURIComponent(openGraphData().data!.ogImage!)}`}
						alt=""
						decoding="async"
						loading="lazy"
						classList={{
							"aspect-square h-full w-auto shrink-0 border-l border-border-secondary bg-background-tertiary object-cover": true,
							"md:aspect-40/21":
								openGraphData().data?.twitterCard === "summary_large_image",
						}}
					/>
				</Show>
			</Show>
		</a>
	);
};
