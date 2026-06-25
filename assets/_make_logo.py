#!/usr/bin/env python3
"""Render Samuel Maths logo variants to PNG (HTML -> headless Chrome -> trim/composite).

Outputs (in this folder):
  samuel-maths-logo.png           full lockup, transparent
  samuel-maths-logo-on-white.png  full lockup on white
  samuel-maths-logo-on-blue.png   full lockup (white) on brand blue
  samuel-maths-mark.png           graph mark only, transparent
"""
import base64, os, subprocess, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "fonts")
HTML = os.path.join(HERE, "_logo.html")
RAW = os.path.join(HERE, "_logo_raw.png")

SCALE = 8           # device-scale-factor: vector upscale for a crisp asset
WIN_W, WIN_H = 760, 260
MARGIN_FRAC = 0.28  # margin around the trimmed lockup, as a fraction of its height

DARK = dict(ink="#15171a", muted="#565b64", rule="rgba(20,23,26,0.26)")
LIGHT = dict(ink="#ffffff", muted="#cdd9f2", rule="rgba(255,255,255,0.38)")
BLUE = (31, 66, 135, 255)   # --accent #1f4287
WHITE = (255, 255, 255, 255)

VARIANTS = [
    dict(out="samuel-maths-logo.png",          bg=None,  colors=DARK,  text=True),
    dict(out="samuel-maths-logo-on-white.png", bg=WHITE, colors=DARK,  text=True),
    dict(out="samuel-maths-logo-on-blue.png",  bg=BLUE,  colors=LIGHT, text=True),
    dict(out="samuel-maths-mark.png",          bg=None,  colors=DARK,  text=False),
]


def data_uri(name):
    with open(os.path.join(FONTS, name), "rb") as f:
        return "data:font/woff2;base64," + base64.b64encode(f.read()).decode()


JAKARTA = data_uri("plus-jakarta-sans.woff2")
LORA = data_uri("lora.woff2")

MARK = """
  <svg class="logo-mark" viewBox="0 0 60 56" width="46" height="43" fill="none">
    <path d="M14 7 V47 H55" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M17 44 C27 43 32 39 36 33 C41 25 46 17 52 10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="36" cy="33" r="2.6" fill="currentColor"/>
    <circle cx="52" cy="10" r="2.6" fill="currentColor"/>
    <text class="logo-axis" x="8.5" y="15" font-size="9">y</text>
    <text class="logo-axis" x="53" y="54" font-size="9">x</text>
  </svg>"""

TEXT = """
  <span class="logo-rule"></span>
  <span class="logo-text">
    <span class="logo-name">Samuel Maths</span>
    <span class="logo-tag">GCSE &amp; A-Level Tuition</span>
  </span>"""


def build_html(c, with_text):
    body = MARK + (TEXT if with_text else "")
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family:"Plus Jakarta Sans"; font-weight:400 700; font-style:normal;
             src:url({JAKARTA}) format("woff2"); }}
@font-face {{ font-family:"Lora"; font-weight:600 700; font-style:italic;
             src:url({LORA}) format("woff2"); }}
* {{ margin:0; padding:0; box-sizing:border-box; }}
html, body {{ background:transparent; }}
body {{ display:inline-block; padding:20px; }}
.logo {{ display:inline-flex; align-items:center; gap:0.85rem; }}
.logo-mark {{ width:46px; height:43px; color:{c['ink']}; flex:none; }}
.logo-axis {{ fill:{c['muted']}; font-family:"Lora", Georgia, serif; font-style:italic; }}
.logo-rule {{ align-self:stretch; width:1px; background:{c['rule']}; }}
.logo-text {{ display:flex; flex-direction:column; gap:0.22rem; line-height:1; text-align:left; }}
.logo-name {{ font-family:"Plus Jakarta Sans", Arial, sans-serif; font-weight:700;
             font-size:1.45rem; letter-spacing:-0.01em; color:{c['ink']}; }}
.logo-tag {{ font-family:"Plus Jakarta Sans", Arial, sans-serif; font-size:0.62rem; font-weight:600;
            letter-spacing:0.16em; text-transform:uppercase; color:{c['muted']}; }}
</style></head><body><span class="logo">{body}
</span></body></html>"""


def find_chrome():
    for p in [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    ]:
        if os.path.exists(p):
            return p
    sys.exit("No Chrome/Edge found")


CHROME = find_chrome()


def render(v):
    with open(HTML, "w", encoding="utf-8") as f:
        f.write(build_html(v["colors"], v["text"]))
    subprocess.run([
        CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
        "--default-background-color=00000000",
        f"--force-device-scale-factor={SCALE}",
        f"--window-size={WIN_W},{WIN_H}",
        "--virtual-time-budget=4000",
        f"--screenshot={RAW}", "file:///" + HTML.replace(os.sep, "/"),
    ], check=True, capture_output=True)

    img = Image.open(RAW).convert("RGBA")
    bbox = img.getbbox()
    if not bbox:
        sys.exit(f"{v['out']}: rendered fully transparent - render failed")
    cropped = img.crop(bbox)
    m = int(round(cropped.height * MARGIN_FRAC))
    bg = v["bg"] if v["bg"] else (0, 0, 0, 0)
    canvas = Image.new("RGBA", (cropped.width + 2 * m, cropped.height + 2 * m), bg)
    canvas.paste(cropped, (m, m), cropped)  # use alpha as mask so it composites onto bg
    out = os.path.join(HERE, v["out"])
    canvas.save(out)
    print(f"wrote {v['out']}  ({canvas.width}x{canvas.height})")


for v in VARIANTS:
    render(v)

for tmp in (HTML, RAW):
    if os.path.exists(tmp):
        os.remove(tmp)
print("done")
