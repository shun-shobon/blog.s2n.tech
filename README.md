# blog.s2n.tech

## 概要

このリポジトリは個人ブログ**blog.s2n.tech**のソースコードです。静的サイトジェネレーターであるAstroを中心に、MDXを用いた記事管理やTailwind CSSでのスタイリングを行い、最終的にCloudflare Workersへデプロイされます。

## 主要技術・ライブラリ

- Astro
- MDX
- Tailwind CSS
- TypeScript
- pnpm
- ESLint / Prettier（`@shun-shobon/style-guide`を利用）
- Cloudflare Workers & Wrangler
- GitHub Actions

## 動作環境

**バージョンは`mise.toml`により固定されています。開発を行う場合は[mise](https://github.com/jdx/mise)の使用を強く推奨します。**

## セットアップ手順

```bash
# miseのセットアップ
mise install

# 依存関係をインストール
pnpm install

# 開発サーバーを起動
pnpm dev
# → http://localhost:4321 が既定ポート（変更可）
```

### よく使うスクリプト

| コマンド         | 説明                                                            |
| ---------------- | --------------------------------------------------------------- |
| `pnpm dev`       | ローカル開発サーバーを起動                                      |
| `pnpm build`     | 本番用静的アセットを `dist/` に出力                             |
| `pnpm preview`   | Wrangler を用いてローカルで Cloudflare Workers としてプレビュー |
| `pnpm lint`      | ESLint による静的解析                                           |
| `pnpm lint:fix`  | ESLint の自動修正                                               |
| `pnpm format`    | Prettier によるフォーマット                                     |
| `pnpm typecheck` | TypeScript 型チェック                                           |

## ビルド

```bash
# 静的ビルド
pnpm build
```

生成物は `dist/` に出力され、Cloudflare Workers で配信可能な形になります。

## デプロイ

本番環境はCloudflare Workersで運用しています。GitHub Actionsにより、mainブランチへのプッシュ時に自動でデプロイされます。また、Pull Requestの際にはデプロイプレビューが自動で作成されます。

## ディレクトリ構成（抜粋）

```text
├─ posts/             # 公開ブログ記事 (mdx)
├─ public/            # 直接配信する静的ファイル (画像、アイコンなど)
├─ src/
│  ├─ components/     # 再利用可能な Astro/React コンポーネント
│  ├─ layouts/        # レイアウトファイル
│  ├─ pages/          # ルーティング対象ページ
│  ├─ styles/         # グローバル CSS
│  └─ libs/           # ビジネスロジックやユーティリティ
├─ astro.config.js    # Astro 設定
├─ wrangler.toml      # Cloudflare Workers 設定
└─ package.json       # スクリプト・依存関係
```

## 開発方針

1. すべてのコミットは `pnpm lint` と `pnpm typecheck` が通る状態を保ちます。
2. コードフォーマットは Prettier に従います。`pnpm format` で自動整形してください。
3. ブログ記事は Markdown / MDX で `posts/` 配下に配置します。
4. 画像や静的アセットは `public/` へ配置し、パスは `/` からの絶対パスで参照します。
