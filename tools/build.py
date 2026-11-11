#!/usr/bin/env python3
"""らくがき学習バトルの ビルド。
  python3 tools/build.py          … js/assets.js（おとなどを うめこんだもの）を 作る
  python3 tools/build.py --canva  … さらに 1ファイル版 dist/rakugaki_canva.html を 作る（Canva用・10MBまで）
"""
import base64, json, pathlib, re, subprocess, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent

def data_url(path, mime):
    return f"data:{mime};base64," + base64.b64encode((ROOT / path).read_bytes()).decode()

# ---- 効果音（効果音ラボ。素材そのものの 再配布は 禁止なので、もとの ファイルは この リポジトリに 入れない）----
# 過去作の リポジトリを となりに clone しておくと、そこから 取りこんで js/assets.js に うめこむ。
# ないときは、いまの js/assets.js に 入っている 音を そのまま 使う。
#   名前: (もとの ファイル, 使う 長さ（びょう。0＝ぜんぶ）, 使いみち)
SIB = ROOT.parent / "nochi-jpg"
WP, LIFE = "word-poker/game/assets/sound/", "manabi-life-assets/sounds/se/"
SOUNDS = {
    "tap":    (WP + "se_ok.mp3", 0, "ボタンを おす"),
    "hover":  (WP + "se_cursor.mp3", 0, "ボタンに カーソルが のる・カウントダウン"),
    "slide":  (WP + "se_slide.mp3", 0, "がめんが かわる・まどが ひらく"),
    "flip":   (WP + "se_flip.mp3", 0, "えらぶ・きりかえる"),
    "place":  (WP + "se_place.mp3", 0, "パーツを おく・もじを うつ"),
    "ok":     (LIFE + "up.mp3", 0, "せいかい・コインが ふえる"),
    "ng":     (WP + "se_ng.mp3", 0, "まちがい"),
    "hit":    (WP + "se_bang.mp3", 0, "こうげきが あたる"),
    "ko":     (WP + "se_ko.mp3", 0, "しあい しゅうりょう"),
    "good":   (WP + "se_good.mp3", 0, "かんせい・ほうせきを みつけた・かいきん"),
    "shop":   (WP + "se_shop.mp3", 0, "おみせで かう"),
    "decide": (LIFE + "decide.mp3", 0, "だいじな けってい（スタート！など）"),
    "cheer":  (LIFE + "cheer.mp3", 3.6, "かち"),
    "shock":  (LIFE + "shock.mp3", 0, "まけ"),
}
IMAGES = ["tenshu_normal", "tenshu_smile"] + ["efude_" + n for n in ["normal", "joy", "angry", "sad", "surprise", "worry", "think", "wink", "teach"]]

def encode_sound(src, sec):
    cmd = ["ffmpeg", "-v", "error", "-y", "-i", str(src)] + (["-t", str(sec), "-af", f"afade=t=out:st={sec - 0.5}:d=0.5"] if sec else []) + ["-ac", "1", "-ar", "32000", "-b:a", "56k", "-f", "mp3", "-"]
    return subprocess.run(cmd, capture_output=True, check=True).stdout

def build_assets():
    dst = ROOT / "js/assets.js"
    old = {}
    if dst.exists():
        m = re.search(r"window\.RG\.ASSETS = (\{.*\});", dst.read_text(encoding="utf-8"), re.S)
        if m: old = json.loads(m.group(1))
    se, miss = {}, []
    for name, (path, sec, _use) in SOUNDS.items():
        src = SIB / path
        if src.exists():
            se[name] = "data:audio/mpeg;base64," + base64.b64encode(encode_sound(src, sec)).decode()
        elif name in old.get("se", {}):
            se[name] = old["se"][name]
        else:
            miss.append(name)
    if miss: print("音が 見つからない（その音は 鳴らない）:", " ".join(miss))
    # BGM：assets/bgm/<名前>.mp3（または .ogg・.m4a）を 置くと 鳴る。名前は docs/BGM.md
    bgm = {p.stem: f"assets/bgm/{p.name}" for p in sorted((ROOT / "assets/bgm").glob("*")) if p.suffix.lower() in (".mp3", ".ogg", ".m4a")}
    assets = {"se": se, "img": {n: data_url(f"assets/npc/{n}.png", "image/png") for n in IMAGES}, "bgm": bgm}
    dst.write_text("// tools/build.py が 作る ファイル（手で 書きかえない）。効果音と NPCの絵を うめこんだもの\nwindow.RG = window.RG || {};\nwindow.RG.ASSETS = " + json.dumps(assets) + ";\n", encoding="utf-8")
    print(f"js/assets.js  {dst.stat().st_size / 1024:.0f} KB（音 {len(se)}・絵 {len(IMAGES)}・BGM {len(bgm)}）")

def build_canva():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    def css(m):
        text = (ROOT / m.group(1)).read_text(encoding="utf-8")
        # フォントは ファイルを そのまま（改造せずに）うめこむ
        text = re.sub(r"url\('\.\./(fonts/[^']+\.ttf)'\)", lambda f: "url('" + data_url(f.group(1), "font/ttf") + "')", text)
        return "<style>\n" + text + "</style>"
    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css, html)
    def js(m):
        src = (ROOT / m.group(1)).read_text(encoding="utf-8").replace("</script", "<\\/script")
        # 1ファイル版では BGMも うめこむ
        MIME = {".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".m4a": "audio/mp4"}
        src = re.sub(r'"(assets/bgm/[^"]+)"', lambda f: '"' + data_url(f.group(1), MIME[pathlib.Path(f.group(1)).suffix.lower()]) + '"', src)
        return "<script>\n" + src + "\n</script>"
    html = re.sub(r'<script src="([^"]+)"></script>', js, html)
    out = ROOT / "dist/rakugaki_canva.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(html, encoding="utf-8")
    size = out.stat().st_size
    print(f"{out.relative_to(ROOT)}  {size/1024/1024:.2f} MB")
    if size > 10 * 1024 * 1024:
        sys.exit("10MBを こえています（Canvaに のせられません）")

if __name__ == "__main__":
    build_assets()
    if "--canva" in sys.argv:
        build_canva()
