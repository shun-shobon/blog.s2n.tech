// eslint-disable-next-line typescript/consistent-type-imports
type Runtime = import("@astrojs/cloudflare").Runtime;

declare namespace App {
	interface Locals extends Runtime {
		otherLocals: {
			test: string;
		};
	}
}
