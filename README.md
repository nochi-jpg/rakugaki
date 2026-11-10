# らくがき学習バトル

自分で描いたモンスターが、問題の正解に合わせて戦う学習バトルゲーム（1〜6年生）。
仕様は `SPEC.md`、いまの状態と次にやることは `CLAUDE.md`。

## いまの状態

ver 0.5.0：キャラづくり＋PNG/QR、モーション、バトル（CPU戦・対人戦）、宝石・コイン・おみせまで、ひととおり遊べる。

- はじめて設定（なまえ・がくねん）→ スライムのチュートリアル
- キャラづくり：スライム・よつあし・とり・さかな・えきたい・ロボット・にそくの7体形。むきえらび → おえかき → くみたて → モーションえらび → なまえ
- モンスターPNG・プレイヤーPNGの出力と読みこみ（JPEGや縮小でにじんだ画像からも復活）
- 「ぜんぶ まとめて だす」、生みの親だけが絵をなおせる
- モーション：体形ごとに3パターン × たいき・こうげき・ダメージ・かち・まけ（関節を軸にしたパーツの回転＋からだの動き）

## 動かし方

`index.html` をブラウザで開く（インストール不要・外部通信なし）。

```bash
python3 tools/build.py --canva
```

↑ 1ファイル版 `dist/rakugaki_canva.html`（Canva用・10MBまで）を作りなおす。`js/assets.js` もこれで作る。

```bash
node tools/flow_test.js
```

↑ 通しテスト（Playwright）。バトルは `node tools/battle_test.js`。画面のはみだし・かぶり、PNGの読みなおしもしらべる。`--canva` で1ファイル版をテスト。

## ファイル

- `js/data.js` 体形テンプレート・パレット・色→教科／`js/codec.js` QRの中身／`js/png.js` PNGの出力・読みこみ／`js/draw.js` おえかき／`js/motion.js` モーション／`js/app.js` 画面／`js/items.js` 宝石・コイン・おみせ／`js/battle.js` バトル／`js/questions.js` 問題（仮）
- `docs/DATA_FORMAT.md` QRとPNGの形／`CREDITS.md` 素材とライブラリ
