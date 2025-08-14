declare module "*.wasm" {
	const content: WebAssembly.Module;
	export default content;
}

// eslint-disable-next-line typescript/consistent-type-imports
type Runtime = import("@astrojs/cloudflare").Runtime<Cloudflare.Env>;

declare namespace App {
	interface Locals extends Runtime {
		otherLocals: {
			test: string;
		};
	}
}
