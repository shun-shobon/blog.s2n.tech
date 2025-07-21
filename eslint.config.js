import { shun_shobon } from "@shun-shobon/style-guide/eslint";

export default shun_shobon(
	{},
	{
		rules: {
			"typescript/explicit-module-boundary-types": [
				"warn",
				{ allowedNames: ["getStaticPaths"] },
			],
		},
	},
);
