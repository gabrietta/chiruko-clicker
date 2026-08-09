# ちる子満足計画・第六版

「残念院ちる子」をクリックして「満足」を集め、アイテムを購入して自動生産を育てる放置・クリッカーゲームです。

## 現在できること

- ちる子をクリック／タップして「満足」を獲得
- クリック強化1種、自動生産施設14種を購入
- 購入数に応じて商品の価格が上昇
- クリック時のキャラクター・数字・ハート・キラキラ演出
- 購入時の通知と演出
- 5秒ごとの自動保存、購入直後の保存
- ページを閉じても進行が残る `localStorage` セーブ
- 最大8時間分のオフライン収益
- 設定画面から確認つきでデータをリセット
- PC／スマートフォン向けレスポンシブ表示
- 大きな数字のカンマ区切りと、1億以上の日本語単位表示
- 条件を達成して埋める86種類の実績図鑑
- 実績1個につき自動生産が1%上がる「徳」ボーナス
- 一定時間ごとに現れるランダムイベント「救済の欠片」
- 進行状況によって内容が増える「満足通信」ニュース欄
- 所有している商品が並ぶ「机のすみ」設備パレード
- 公式プロフィールをもとにした、ちる子の吹き出しや世界観メッセージ
- 画面中央の「満足界」に、購入設備と歩き回るミニちる子を表示
- 設備を1個・10個・100個まとめて購入
- 12種類の買い切り強化「御利益」
- 春夏秋冬で自動的に切り替わる季節イベントと期間ボーナス
- 設備などを手放して永久強化「救済印」を得る再布教（周回）。印が増えるほど補正と獲得数の伸びは緩やかになります
- 累計満足、最高生産量、プレイ時間などを確認できる活動記録
- クリック音、効果音、仮ボイス、仮BGMの個別オン・オフと音量設定
- 全15施設に10・25・50個の節目ボーナス（到達ごとに施設効率1.4倍）
- 救済の欠片から発生する、即時獲得・生産7倍・クリック77倍・設備覚醒などのランダム効果
- 救済効果を同時に重ねるコンボと、続けて欠片を追う「満足チェーン」
- 救済印で取得し、周回しても残る8種類の「恒久教義」
- 実績報酬として解放される、ちる子の4つの姿と4種類の観測室背景
- 時間帯・進行・設備・救済効果に応じて切り替わる70種類以上のちる子の台詞
- 後半用施設「深夜のラーメン聖堂」から「宇宙ちる子布教船」まで5種類を追加
- 中盤施設「Sora2」と、布教船の先にある架空の進化版「Sora3」を追加
- 全15施設に、商品名と説明文をモチーフにした統一デザインの透過アイコン

## 1. ゲームを起動する方法

このフォルダを開いた状態で、次のコマンドを上から順番に実行します。

```bash
npm install
npm run dev
```

画面に表示された `http://localhost:5173/` のようなアドレスをブラウザで開いてください。

開発画面を終了するときは、コマンドを入力した画面で `Ctrl + C` を押します。

## 2. 公開用ファイルを作る方法

```bash
npm run build
```

成功すると、このプロジェクト内に `dist` フォルダが作られます。これが公開用ファイル一式です。

作成した公開版を手元で確認したい場合は、次を実行します。

```bash
npm run preview
```

## 3. ちる子のメイン画像を変更する場所

1. 新しい PNG または WebP 画像を `public/assets/characters` に入れます。
2. `src/config/gameConfig.ts` を開きます。
3. `characterImages` の `main` を、新しい画像のファイル名へ変更します。

例：`public/assets/characters/chiruko-new.webp` を使う場合

```ts
characterImages: {
  main: '/assets/characters/chiruko-new.webp',
  // 以下はそのままで構いません
}
```

先頭の `/assets/characters/` は `public` フォルダ内を表しています。透過PNGにも対応しています。

現在は、提供された4画像と笑顔差分を保存済みです。

- `chiruko-sit.png`：メインのクリック対象
- `chiruko-smile.png`：目を開けた、やわらかい笑顔差分
- `chiruko-nikoniko.png`：目を閉じた、にっこり笑顔差分
- `chiruko-sleep.png`：オフライン収益の画面
- `chiruko-read.png`：今後の演出用
- `chiruko-run.png`：今後の演出用

## 4. アイテム画像を追加・変更する場所

1. 画像を `public/assets/items` に入れます。
2. `src/config/gameConfig.ts` の該当商品へ `imagePath` を追加します。

例：`public/assets/items/sweet.png` を「あまいおやつ」に使う場合

```ts
{
  id: 'sweet-treat',
  name: 'あまいおやつ',
  // 途中の設定は省略
  icon: '♢',
  imagePath: '/assets/items/sweet.png',
},
```

`imagePath` がない商品は `icon` の文字が仮アイコンとして表示されます。画像が読み込まれると仮アイコンの代わりに画像が表示されます。

## 5. 新しいショップ商品を追加する方法

`src/config/gameConfig.ts` の `SHOP_ITEMS` 配列へ、商品を1項目追加します。ショップの画面側を編集する必要はありません。

```ts
{
  id: 'example-item',             // 他の商品と重ならない半角英数字のID
  name: '新しい商品',
  description: '商品の説明です。',
  baseCost: 1000,                 // 最初の価格
  costGrowth: 1.15,               // 1個買うごとの価格倍率
  effectType: 'perSecond',        // 'click' または 'perSecond'
  effectValue: 10,                // 1個あたりの効果
  icon: '✦',                      // 画像がない場合の仮アイコン
  imagePath: '/assets/items/example.png', // 画像がなければこの行を削除
},
```

`effectType` の意味：

- `click`：1クリックあたりの満足を増やす
- `perSecond`：1秒あたりの自動生産を増やす

価格、効果、名称、説明、画像パスはすべて同じ設定ファイルにまとまっています。

## 6. Netlifyなどへ公開するときに使うフォルダ

公開に使うフォルダは `dist` です。

Twitter/XなどでURLを共有した際のリンクカード画像は、`public/assets/social/chiruko-og.png`です。
背景素材を変更した後にリンクカードを作り直す場合は、PowerShellで`scripts/render-social-card.ps1`を実行してください。

### 手軽な方法

1. `npm run build` を実行します。
2. Netlifyへログインします。
3. Netlifyの手動デプロイ画面へ `dist` フォルダをドラッグ＆ドロップします。

### Git連携する方法

このプロジェクトには `netlify.toml` を用意済みです。Netlifyでリポジトリを接続するときは次の内容になります。

- Build command：`npm run build`
- Publish directory：`dist`

## 主なファイル構成

```text
src/
  components/        画面の部品
  config/            商品・画像・実績・御利益・季節イベントの設定
  game/              価格計算、セーブ、オフライン収益
  hooks/             ゲーム進行の制御
  types/             TypeScriptのデータ型
  utils/             数字・時間の表示処理
  audio/             音の再生と、実際の音声素材へ差し替える入口
public/
  assets/characters/ ちる子画像
  assets/items/      商品画像
  assets/audio/voice/ 台詞ごとのMP3音声
dist/                npm run buildで作る公開用フォルダ
```

恒久教義は `src/config/doctrines.ts`、実績で解放される姿と背景は
`src/config/cosmetics.ts` にまとまっています。項目を追加するときは、この2ファイルを編集します。
ちる子の台詞は `src/config/dialogues.ts` にまとめてあり、配列へ文章を追加するだけで増やせます。
現在の全台詞と、音声化・MP3割り当ての手順は
[docs/dialogues.md](docs/dialogues.md) にまとめています。

## 7. GitHub Pagesで無料公開する方法

Netlifyの代わりにGitHub Pagesへ公開することもできます。このプロジェクトには、GitHubへ更新を送ると自動でビルド・公開する設定を用意しています。

### 最初の一回だけ行うこと

1. GitHub Desktopをインストールし、GitHubアカウントでログインします。
2. GitHub Desktopの「File」→「Add local repository」→「Choose…」を選びます。
3. 次のフォルダを選び、「Add repository」を押します。  
   `C:\Users\Gabrietta\Documents\Codex\2026-07-20\w\outputs\chiruko-clicker`
4. 右上の「Publish repository」を押し、名前を `chiruko-clicker` にします。
5. **Keep this code private** のチェックを外してから公開します（GitHub FreeのPagesは公開リポジトリで使います）。
6. GitHubのリポジトリ画面で「Settings」→「Pages」を開き、「Source」を **GitHub Actions** にします。
7. 「Actions」タブの `Deploy Chiruko Clicker to GitHub Pages` が完了すると公開されます。

このフォルダには、公開に不要な `node_modules`・`dist`・`tmp` を送らない設定も入っています。以後はファイルを変更してGitHub Desktopの「Commit」→「Push origin」を押すだけです。

公開URLは次の形です。

```text
https://あなたのGitHubユーザー名.github.io/chiruko-clicker/
```

### 更新するとき

ファイルを変更したら、GitHub Desktopで「Commit to main」→「Push origin」を押すだけです。数分後にGitHub Pagesへ反映されます。毎回 `dist` を手動で作ってアップロードする必要はありません。

### セーブデータをNetlify版から移す方法

Netlify版とGitHub Pages版はURLが違うため、ブラウザの自動保存は共有されません。

1. Netlify版を開き、設定画面の「セーブを書き出す」を押します。
2. 表示された長いセーブコードをコピーします。
3. GitHub Pages版を開き、設定画面の入力欄へ貼り付けます。
4. 「セーブを読み込む」を押します。

これで満足、設備、実績、アップグレードなどを引き継げます。

### GitHub Pagesで画像や音声が表示されない場合

このプロジェクトはリポジトリ用のURL（`/chiruko-clicker/`）に対応済みです。Actionsのビルドが成功した公開URLを開いてください。古い表示が残る場合は、ブラウザで `Ctrl + F5` を押して再読み込みします。

### ソースコードの公開について

GitHub FreeのGitHub Pagesは、通常は公開リポジトリが必要です。そのため、ソースコードや画像・音声ファイルも見える状態になります。ブラウザゲームは公開後のJavaScriptを完全に隠すことはできません。設定や台詞を見られたくない場合は、Netlifyの`dist`だけを公開する方法のほうが向いています。
MP3を追加した後の台詞ごとの割り当て先は `src/audio/voiceClips.ts` です。

付属の音声メーカーにCLIモードがあるため、台詞CSVから一括生成できます。まずは6本だけなら `scripts/generate-six-voices.cmd` をダブルクリックしてください。付属アプリの同梱APIキーを自動で使い、生成後は `voiceClips.ts` も更新します。ElevenLabsへ接続できない環境では生成できないため、その場合はアプリのGUIで作成したMP3を `public/assets/audio/voice` に置いてください。

## セーブデータについて

進行状況はブラウザの `localStorage` に保存されます。サーバーには送信されません。

- 同じ端末・同じブラウザで再び開くと続きから遊べます。
- 別端末や別ブラウザへは自動で移りません。
- ブラウザのサイトデータを削除すると進行も削除されます。
- 端末間で移すときは、設定画面の「セーブを書き出す」でコードを作成し、移行先の設定画面へ貼り付けて「セーブを読み込む」を押します。読み込み前に確認が表示されます。
- オフライン収益は最大8時間です。変更する場合は `src/config/gameConfig.ts` の `maxOfflineSeconds` を編集します。
- 旧版のセーブデータは、新しい項目を初期値で補いながら自動的に引き継がれます。

クリックを短時間に続けると「ひとさわり連祷」コンボが発生します。最大50コンボ、クリック効果は最大+15%です。2.2秒さわらないとコンボはリセットされます。

## 実績を追加・変更するとき

実績は `src/config/achievements.ts` にまとまっています。1項目追加すると実績図鑑へ自動で表示されます。

主な条件の種類は次のとおりです。

- `totalSatisfaction`：累計満足
- `manualClicks`：手動クリック回数
- `perSecond`：1秒あたりの基本生産量
- `totalOwned`：商品の合計所有数
- `uniqueItems`：所有している商品の種類数
- `itemOwned`：特定商品の所有数
- `luckyEvents`：「救済の欠片」を取った回数
- `upgradesOwned`：購入した御利益の数
- `prestigeCount`：再布教した回数
- `virtueMarks`：救済印の数
- `bestClickCombo`：クリック最高コンボ
- `luckyVarieties`：体験した救済イベントの種類数
- `playSeconds`：累計プレイ時間（秒）
- `offlineSessions`：留守番報酬を受け取った回数
- `longestOffline`：最長の留守時間（秒）

`hidden: true` を設定すると、解除するまで名前と条件が伏せられた隠し実績になります。

## 秘蔵記録（記念絵）を追加・変更するとき

記念絵の設定は `src/config/memorials.ts`、画像ファイルは `public/assets/memorials` にまとめています。
現在の秘蔵記録は累計500兆・5京・1秭満足で解放され、初回だけ自動で大きく表示されます。以後は実績図鑑の「秘蔵記録」から何度でも見返せます。

## 御利益や季節イベントを変更するとき

- 御利益：`src/config/upgrades.ts`
- 季節イベント：`src/config/seasons.ts`
- 再布教に必要な満足と救済印の効果：`src/config/gameConfig.ts`

御利益も設定配列へ1項目追加するだけでショップへ表示されます。季節イベントは `months` に指定した月に自動開催されます。

## 音声を追加するとき

音声ファイルを `public/assets/audio` へ置き、`src/audio/audioManager.ts` の `AUDIO_PATHS` にパスを設定します。パスが `null` の間は、クリック音・効果音・BGMはブラウザ内で生成され、ボイスはブラウザの日本語音声合成で代用されます。

設定画面では「すべての音」「クリック音」「効果音」「ちる子ボイス」「BGM」を個別に切り替えられます。BGMとボイスは初期状態ではオフです。

## 動作確認

```bash
npm run build
```

このコマンドではTypeScriptの型チェックとViteの公開用ビルドをまとめて行います。エラーが表示されなければ公開用ファイルは正常に作成されています。
