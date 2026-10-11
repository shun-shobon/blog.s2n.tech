import { createRequire } from "node:module";

import { shun_shobon } from "@shun-shobon/style-guide/eslint";

const require = createRequire(import.meta.url);

export default shun_shobon(
	{},
	{
		// eslint-plugin-reactの`version: "detect"`はESLint v10で削除された`context.getFilename`を呼んで落ちるため明示する
		settings: { react: { version: require("react/package.json").version } },
	},
	{
		rules: {
			"typescript/explicit-module-boundary-types": [
				"warn",
				{ allowedNames: ["getStaticPaths"] },
			],
		},
	},
);
