/* @jsxImportSource react */

import fs from "node:fs/promises";

import { initWasm, Resvg } from "@resvg/resvg-wasm";
import RESVG_WASM from "@resvg/resvg-wasm/index_bg.wasm";
import type { ReactNode } from "react";
import satori from "satori";

import MyIcon from "@/assets/my-icon.png?inline";

const SITE_NAME = "blog.s2n.tech";
const AUTHOR_NAME = "しゅん🌙";

const WIDTH = 1200;
const HEIGHT = 630;

// const COLOR_BORDER_PRIMARY = "#f5f5f5";
const COLOR_BORDER_PRIMARY = "#e5e5e5";
const COLOR_BACKGROUND_PRIMARY = "#ffffff";
const COLOR_TEXT_PRIMARY = "#262626";
const COLOR_TEXT_SECONDARY = "#525252";
const COLOR_TEXT_HEADING = "#0a0a0a";
const FONT_CAVEAT = "Caveat";
const FONT_COURIER_PRIME = "Courier Prime";
const FONT_NOTO_SANS_JP = "Noto Sans JP";
const BACKGROUND_GRID_SIZE = "16px";

try {
	await initWasm(RESVG_WASM);
} catch {
	// noop
}

const fontNotoSansJP = await fs.readFile("./src/assets/NotoSansJP-Bold.ttf");
const fontCaveat = await fs.readFile("./src/assets/Caveat-Bold.ttf");
const fontCourierPrime = await fs.readFile(
	"./src/assets/CourierPrime-Regular.ttf",
);

// ZWJ: Zero Width Joiner
const ZWJ = String.fromCodePoint(0x20_0d);
// EPVS: VARIATION SELECTOR-16
const EPVS_REGEX = /\uFE0F/gu;

interface Props {
	title: string;
	tags: string[];
}

function OGImage({ title, tags }: Props): ReactNode {
	return (
		<div
			lang="ja-JP"
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				backgroundColor: COLOR_BACKGROUND_PRIMARY,
				color: COLOR_TEXT_PRIMARY,
				lineHeight: "1.5",
				fontFamily: FONT_NOTO_SANS_JP,
			}}
		>
			<div
				style={{
					width: "100%",
					height: "100%",
					position: "absolute",
					inset: 0,
					backgroundImage: `linear-gradient(0deg, ${COLOR_BORDER_PRIMARY} 1px, transparent 1px)`,
					backgroundSize: `${BACKGROUND_GRID_SIZE} ${BACKGROUND_GRID_SIZE}`,
					backgroundPosition: "50% 50%",
				}}
			/>
			<div
				style={{
					width: "100%",
					height: "100%",
					position: "absolute",
					inset: 0,
					backgroundImage: `linear-gradient(90deg, ${COLOR_BORDER_PRIMARY} 1px, transparent 1px)`,
					backgroundSize: `${BACKGROUND_GRID_SIZE} ${BACKGROUND_GRID_SIZE}`,
					backgroundPosition: "50% 50%",
				}}
			/>

			<div
				style={{
					width: "100%",
					height: "100%",
					padding: "32px",
					display: "flex",
				}}
			>
				<div
					style={{
						width: "100%",
						height: "100%",
						padding: "48px",
						display: "flex",
						flexDirection: "column",
						justifyContent: "space-between",
						backgroundColor: COLOR_BACKGROUND_PRIMARY,
						borderRadius: "16px",
						border: `1px solid ${COLOR_BORDER_PRIMARY}`,
						boxShadow:
							"0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
					}}
				>
					<div
						style={{
							width: "100%",
							display: "flex",
							flexDirection: "column",
							gap: "32px",
						}}
					>
						<span
							style={{
								color: COLOR_TEXT_HEADING,
								fontSize: "48px",
								fontWeight: "bold",
							}}
						>
							{title}
						</span>
						<div
							style={{
								display: "flex",
								flexWrap: "wrap",
								gap: "24px",
							}}
						>
							{tags.map((tag) => (
								<span
									key={tag}
									style={{
										backgroundColor: COLOR_BACKGROUND_PRIMARY,
										border: `1px solid ${COLOR_TEXT_SECONDARY}`,
										color: COLOR_TEXT_SECONDARY,
										padding: "4px 16px 4px 16px",
										borderRadius: "9999px",
										fontFamily: FONT_COURIER_PRIME,
										fontSize: "28px",
										display: "flex",
										alignItems: "center",
										gap: "4px",
									}}
								>
									<svg width="20" height="20" viewBox="0 0 24 24">
										<g
											fill="none"
											stroke="currentColor"
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
										>
											<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"></path>
											<circle
												cx="7.5"
												cy="7.5"
												r=".5"
												fill="currentColor"
											></circle>
										</g>
									</svg>
									<span
										style={{
											fontSize: "24px",
											lineHeight: "1",
											marginTop: "2px",
										}}
									>
										{tag}
									</span>
								</span>
							))}
						</div>
					</div>

					<div
						style={{
							width: "100%",
							display: "flex",
							justifyContent: "space-between",
							alignItems: "flex-end",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "16px",
							}}
						>
							<img
								alt=""
								src={MyIcon}
								style={{
									width: "80px",
									height: "80px",
									borderRadius: "9999px",
									border: `1px solid ${COLOR_BORDER_PRIMARY}`,
								}}
							/>
							<span
								style={{
									fontSize: "36px",
									fontWeight: "bold",
								}}
							>
								{AUTHOR_NAME}
							</span>
						</div>
						<span
							style={{
								lineHeight: "1",
								fontFamily: FONT_CAVEAT,
								fontSize: "56px",
								fontWeight: "bold",
								transform: "rotate(-5deg) translate(-12px, -4px)",
							}}
						>
							{SITE_NAME}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}

function getIconCode(segment: string): string {
	// ZWJが含まれない単独の絵文字の場合、末尾のEPVSが含まれるとURLが見つからないため削除する
	const str = !segment.includes(ZWJ)
		? segment.replaceAll(EPVS_REGEX, "")
		: segment;

	// eslint-disable-next-line typescript/no-misused-spread
	const codePoints = [...str]
		.map((c) => c.codePointAt(0)!.toString(16))
		.join("-");

	return codePoints;
}

async function loadEmoji(segment: string): Promise<string> {
	const code = getIconCode(segment);
	const url = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${code.toLowerCase()}.svg`;

	const res = await fetch(url);
	const base64 = await res
		.arrayBuffer()
		.then((buf) => Buffer.from(buf).toString("base64"));

	return `data:image/svg+xml;base64,${base64}`;
}

export async function generateImage({
	title,
	tags,
}: Props): Promise<Uint8Array<ArrayBuffer>> {
	const svg = await satori(<OGImage title={title} tags={tags} />, {
		width: WIDTH,
		height: HEIGHT,
		fonts: [
			{
				name: FONT_NOTO_SANS_JP,
				data: fontNotoSansJP,
				weight: 700,
			},
			{
				name: FONT_CAVEAT,
				data: fontCaveat,
				weight: 700,
			},
			{
				name: FONT_COURIER_PRIME,
				data: fontCourierPrime,
				weight: 400,
			},
		],
		async loadAdditionalAsset(code, segment) {
			if (code === "emoji") {
				return await loadEmoji(segment);
			}

			return segment;
		},
	});

	const resvg = new Resvg(svg, {
		background: COLOR_BACKGROUND_PRIMARY,
	});
	const img = resvg.render().asPng();

	return img as Uint8Array<ArrayBuffer>;
}
