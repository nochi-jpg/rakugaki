#!/usr/bin/env python3
"""らくがき学習バトルの ビルド。
  python3 tools/build.py          … js/assets.js（おとなどを うめこんだもの）を 作る
  python3 tools/build.py --canva  … さらに 1ファイル版 dist/rakugaki_canva.html を 作る（Canva用・10MBまで）
"""
import base64, json, pathlib, re, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent

def data_url(path, mime):
    return f"data:{mime};base64," + base64.b64encode((ROOT / path).read_bytes()).decode()

def build_assets():
    assets = {"decide": data_url("assets/audio/decide.mp3", "audio/mpeg"),
              # てんしゅ（K.nom の 線画。ふつう／かったときの えがお）
              "tenshu": data_url("assets/npc/tenshu_normal.png", "image/png"),
              "tenshuSmile": data_url("assets/npc/tenshu_smile.png", "image/png")}
    (ROOT / "js/assets.js").write_text(
        "// tools/build.py が 作る ファイル（手で 書きかえない）\nwindow.RG = window.RG || {};\nwindow.RG.ASSETS = " + json.dumps(assets) + ";\n", encoding="utf-8")

def build_canva():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', lambda m: "<style>\n" + (ROOT / m.group(1)).read_text(encoding="utf-8") + "</style>", html)
    def js(m):
        src = (ROOT / m.group(1)).read_text(encoding="utf-8").replace("</script", "<\\/script")
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
