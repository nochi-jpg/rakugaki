# らくがき学習バトル（nochi-jpg/rakugaki）

## いまの状態（2026-11-11）

- 仕様書 `SPEC.md`。**15章（UIリメイク）と 14章・8章の K.nom 決定が、古い章より優先。** 参考画像は `docs/ref/`。
- **ver 0.9.1：ひととおり遊べる。**
  - キャラづくり＋PNG/QR（7体形）、モーション3種×5動作、スライムのじゆうパーツ
  - バトル：れんしゅう バトル（CPU戦）と ともだちと たいせん（1台で2人）。3Dステージ＋動くカメラ、はやさ ×1〜×6、会心・とどめの カットイン
  - 宝石（いし＋1〜＋10・1体に1つ・3年生から）、コイン、ログインボーナス、1日の回数、おみせ
  - 問題は nochi-jpg/manabi-resource の 6,497問。かんじモード／ひらがなモード を はじめて設定で 選ぶ（せっていで 変えられる）
  - UIリメイク：しねきゃぷしょん、アイコン、動くボタン、えふでの チュートリアルと おはなし、過去作の 効果音
- 仮のもの：バトル・モーション・カメラの数値（Claude の案）、のらくがき（CPU）の絵（自動で作った絵）。
- BGMは 内蔵の チップチューン 9きょく（`js/bgm.js`。譜面データを その場で 鳴らす。Claude が 作った オリジナル）。**音は 耳で 確かめられていない**ので、K.nom に 聞いてもらって 直す。`docs/BGM.md`
- デバッグモード：せってい（または タイトル）の 右下の「K.nom」を 30回 おす。ぜんぶ 解禁・わく6・コイン5000 に なり、せっていに デバッグの ボタン（データを ふっかつ・データを けす など）が 出る。**セーブデータの 復元と 消去は デバッグモードからだけ**（タイトルの 復元ボタンも デバッグモードの ときだけ 出る）。

## 次にやること

1. K.nom に全体をさわってもらい、直す所を聞く。
2. BGMを 聞いてもらって 直す。のらくがきの絵（K.nom）を入れる。
3. 実機（学校端末のEdge・iPad）での確認。

## 作業のしかた

- 直したら `python3 tools/build.py --canva`（1ファイル版 `dist/rakugaki_canva.html` と `js/assets.js` を作りなおす）。
- `node tools/flow_test.js`（キャラづくり・PNG）・`node tools/battle_test.js`（じゆうパーツ・バトル・宝石・おみせ）・`node tools/tutorial_test.js`（チュートリアル・フォント・音）が、それぞれ `--canva` つきでも「ぜんぶ OK」になることを確かめる（画面のはみだし・かぶりもしらべる）。
- 効果音は `tools/build.py` が `../nochi-jpg/word-poker` と `../nochi-jpg/manabi-life-assets` から取りこむ（ないときは、いまの `js/assets.js` の音をそのまま使う）。**音のもとのファイルは このリポジトリに 入れない**（効果音ラボの素材は再配布禁止）。
- フォント `fonts/cinecaption226.ttf` は **改造禁止**（サブセット化もしない）。そのまま うめこむ。
- 画面の部品（音・アイコン・まど・えふでの会話とガイド・かな入力）は `js/ui.js`。
- 問題データは nochi-jpg/manabi-resource を `../nochi-jpg/manabi-resource` に clone して、`python3 tools/make_questions.py` で `js/questions.js` を作りなおす（`dist/questions.min.json` を読む）。
- `node tools/motion_sheet.js` でモーションのコマを並べた画像を作れる（見た目の確認用）。
- QRとPNGの形は `docs/DATA_FORMAT.md`。項目は「うしろに足す」だけ。PNGの席とパーツの順番は変えない。

## 参考にするリポジトリ（nochi-jpg 配下）

- おえかき部分：`nochi-jpg/oekaki-relay`
- QRの考え方：`nochi-jpg/manabi-battle`
- 問題データ：`nochi-jpg/manabi-resource`（問題を直すのは そちらの リポジトリ）
- 効果音：`nochi-jpg/word-poker`・`nochi-jpg/manabi-life-assets`

## このリポジトリでやらないこと

- 問題づくり・問題の直しは、nochi-jpg/manabi-resource で行う（ここでは取りこむだけ）。

## 作るときの決まり（くわしくは SPEC.md）

- 1ファイルHTML（Canva版・10MBまで）＋ GitHub Pages版。外部通信なし。
- 16:9固定レイアウト（1280×720基準）。白黒の手書き風UIで、色が付くのはモンスターと 宝石の線だけ。
- 対象は 小学1〜6年生。
- ひらがなメイン。絵文字とスクロールバーは使わない。
- タッチ・ペン・トラックパッドのどれでも全モードで操作できる。iPhone・iPad（Safari）でも動くようにする。
- 文字のはみだし、カードのかぶり、画面外のボタンがないかを全画面でチェックする。
