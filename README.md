# VOICEVOX API ベンチマークツール

このツールは、VOICEVOX APIを使用して複数話者での音声合成のベンチマークを実行します。

## 機能

- 複数話者・複数スタイルからランダムに選択
- 50文字程度の日本語文章をランダム生成
- 同時リクエスト5つでの並列処理
- 100件の音声合成実行
- 平均処理時間の計測と分析

## 前提条件

- Node.js (v14以上)
- VOICEVOX ENGINE が `http://localhost:50021` で稼働している必要があります

## インストール

```bash
npm install
```

## 設定

### 環境変数での設定（推奨）

`.env.example` をコピーして `.env` ファイルを作成し、設定を変更してください：

```bash
cp .env.example .env
```

`.env` ファイルの例：
```env
# VOICEVOX API設定
VOICEVOX_URL=http://localhost:50021

# ベンチマーク設定
TOTAL_REQUESTS=100
CONCURRENT_REQUESTS=5
REQUEST_INTERVAL=0
```

### コード内での設定

または、`index.js` の設定セクションで直接値を変更することもできます。

## 使用方法

```bash
npm start
```

または

```bash
node index.js
```

## 出力

- `benchmark_results.json` にベンチマーク結果の詳細が保存されます

## 結果の見方

- **全体平均**: 1回の音声合成にかかる平均時間
- **クエリ生成平均**: `/audio_query` APIの平均応答時間  
- **音声合成平均**: `/synthesis` APIの平均応答時間

## 環境変数

以下の環境変数で設定を変更できます：

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `VOICEVOX_URL` | VOICEVOX ENGINEのURL | `http://localhost:50021` |
| `TOTAL_REQUESTS` | 実行する音声合成の総数 | `100` |
| `CONCURRENT_REQUESTS` | 同時に実行するリクエスト数 | `5` |
| `REQUEST_INTERVAL` | バッチ処理間の待機時間（ミリ秒） | `0` |

## 設定

`index.js` の上部にある設定セクションで以下の値を変更できます：

```javascript
// VOICEVOX APIのベースURL
const BASE_URL = 'http://localhost:50021';

// ベンチマーク設定
const TOTAL_REQUESTS = 100;           // 総リクエスト数
const CONCURRENT_REQUESTS = 5;        // 同時リクエスト数
const REQUEST_INTERVAL = 100;         // バッチ間の待機時間（ミリ秒）
```

### 設定項目の説明

- **BASE_URL**: VOICEVOX ENGINEのURL
- **TOTAL_REQUESTS**: 実行する音声合成の総数（デフォルト: 100）
- **CONCURRENT_REQUESTS**: 同時に実行するリクエスト数（デフォルト: 5）
- **REQUEST_INTERVAL**: バッチ処理間の待機時間。サーバー負荷を軽減するための間隔（デフォルト: 100ms）
- **SAMPLE_TEXTS**: 使用する日本語文章のリスト

## APIエンドポイント

このツールは以下のVOICEVOX APIエンドポイントを使用します：

- `GET /speakers` - 利用可能な話者一覧を取得
- `POST /audio_query` - 音声クエリを生成
- `POST /synthesis` - 音声合成を実行

## 設定

`index.js` 内の以下の設定を変更できます：

- `BASE_URL`: VOICEVOX ENGINEのURL（デフォルト: `http://localhost:50021`）
- `SAMPLE_TEXTS`: 使用する日本語文章のリスト
- 同時リクエスト数（デフォルト: 5）
- 総リクエスト数（デフォルト: 100）
