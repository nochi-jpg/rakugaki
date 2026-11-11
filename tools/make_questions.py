#!/usr/bin/env python3
"""js/questions.js を 作る（問題データ）。
  python3 tools/make_questions.py [manabi-resource の dist/questions.min.json]

問題は nochi-jpg/manabi-resource（まなび4択問題データベース）から 取りこむ。
リソースを 直したら、そのリポジトリで tools/build.py を 動かしてから、これを 動かしなおす。

出力の形：
  RG.QUNITS = [[単元ID, 単元名（かな）, 単元名], ...]
  RG.QDB    = [[学年, 教科番号, 単元の番号, 問題ID, 問題文, [正解, ハズレ×3], 解説, かなの問題文, [かなの選択肢×4], かなの解説], ...]
  ・選択肢は 先頭が正解（出すときに まぜる）
  ・かなが 漢字モードと 同じときは 0（大きさを へらすため）
  ・教科番号： 0=国語 1=算数 2=社会（1・2年は せいかつA）3=理科（1・2年は せいかつB）4=英語
"""
import json, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ROOT.parent / "nochi-jpg/manabi-resource/dist/questions.min.json")
SUBJ = {"国語": 0, "算数": 1, "社会": 2, "せいかつA": 2, "理科": 3, "せいかつB": 3, "英語": 4}

db = json.loads(SRC.read_text(encoding="utf-8"))
units = db["units"]
uidx = {u["id"]: i for i, u in enumerate(units)}
rows = []
for q in db["questions"]:
    k = q["kana"]
    c, kc = q["choices"], k["choices"]
    assert len(c) == 4 and len(kc) == 4, q["id"]
    rows.append([q["grade"], SUBJ[q["subject"]], uidx[q["unitId"]], q["id"], q["q"], c, q["exp"],
                 0 if k["q"] == q["q"] else k["q"], 0 if kc == c else kc, 0 if k["exp"] == q["exp"] else k["exp"]])

dump = lambda x: json.dumps(x, ensure_ascii=False, separators=(",", ":"))
out = ["// tools/make_questions.py が 作る ファイル（手で 書きかえない）",
       f"// 問題：nochi-jpg/manabi-resource（version {db.get('version')}・{len(rows)}問・{len(units)}単元）",
       "// 形：[学年, 教科番号, 単元の番号, 問題ID, 問題文, [正解, ハズレ×3], 解説, かなの問題文, [かなの選択肢], かなの解説]（かなが 同じときは 0）",
       "// 教科番号：0=国語 1=算数 2=社会（1・2年は せいかつA）3=理科（1・2年は せいかつB）4=英語",
       "window.RG = window.RG || {};",
       "window.RG.QUNITS = " + dump([[u["id"], u.get("nameKana") or u["name"], u["name"]] for u in units]) + ";",
       "window.RG.QDB = ["]
out += [dump(r) + "," for r in rows]
out.append("];")
dst = ROOT / "js/questions.js"
dst.write_text("\n".join(out) + "\n", encoding="utf-8")
cnt = {}
for r in rows: cnt[(r[0], r[1])] = cnt.get((r[0], r[1]), 0) + 1
print(f"{len(rows)}問・{len(units)}単元  {dst.stat().st_size / 1024 / 1024:.2f} MB")
print(" ".join(f"{g}年-{s}:{n}" for (g, s), n in sorted(cnt.items())))
