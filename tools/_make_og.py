#!/usr/bin/env python3
"""Generate simple branded OG images (SVG source -> PNG via headless Chrome)."""
import subprocess, os, sys

W, H = 1200, 630
BRAND = "#1f4287"
ACCENT = "#5b8def"
HERE = os.path.dirname(os.path.abspath(__file__))

# subject pages: (output-slug, eyebrow, line1, line2)
SUBJECTS = [
    ("a-level-maths",        "A-LEVEL MATHS TUTOR",          "A-Level",        "Mathematics"),
    ("a-level-further-maths","A-LEVEL FURTHER MATHS TUTOR",   "A-Level Further", "Mathematics"),
    ("gcse-maths",           "GCSE MATHS TUTOR",             "GCSE",           "Mathematics"),
    ("gcse-physics",         "GCSE PHYSICS TUTOR",           "GCSE",           "Physics"),
]

LOGO = (
    '<g transform="translate(0,4) scale(1.5)" fill="none" stroke="#ffffff">'
    '<path d="M14 7 V47 H55" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    '<path d="M17 44 C27 43 32 39 36 33 C41 25 46 17 52 10" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'
    '<circle cx="36" cy="33" r="2.6" fill="#ffffff" stroke="none"/>'
    '<circle cx="52" cy="10" r="2.6" fill="#ffffff" stroke="none"/>'
    '</g>'
)

def svg(eyebrow, line1, line2):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
  <defs>
    <radialGradient id="glow" cx="78%" cy="18%" r="70%">
      <stop offset="0%" stop-color="#2a5bb5"/>
      <stop offset="100%" stop-color="{BRAND}"/>
    </radialGradient>
  </defs>
  <rect width="{W}" height="{H}" fill="{BRAND}"/>
  <rect width="{W}" height="{H}" fill="url(#glow)"/>
  <g font-family="Segoe UI, Arial, Helvetica, sans-serif">
    <!-- brand lockup -->
    <g transform="translate(90,86)">
      {LOGO}
      <text x="104" y="48" font-size="40" font-weight="700" fill="#ffffff">Samuel Maths</text>
    </g>
    <!-- eyebrow -->
    <text x="92" y="312" font-size="26" font-weight="700" letter-spacing="3" fill="{ACCENT}">{eyebrow}</text>
    <!-- title -->
    <text x="88" y="392" font-size="92" font-weight="800" fill="#ffffff">{line1}</text>
    <text x="88" y="486" font-size="92" font-weight="800" fill="#ffffff">{line2}</text>
    <!-- accent rule -->
    <rect x="92" y="520" width="120" height="6" rx="3" fill="{ACCENT}"/>
    <!-- tagline -->
    <text x="92" y="566" font-size="30" font-weight="500" fill="#cdd9f2">Online one-to-one tutoring &#183; First session free</text>
  </g>
</svg>'''

def find_chrome():
    for p in [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    ]:
        if os.path.exists(p):
            return p
    sys.exit("No Chrome/Edge found")

chrome = find_chrome()
for slug, eyebrow, l1, l2 in SUBJECTS:
    svg_path = os.path.join(HERE, f"og-{slug}.svg")
    png_path = os.path.join(HERE, f"og-{slug}.png")
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg(eyebrow, l1, l2))
    subprocess.run([
        chrome, "--headless", "--disable-gpu", "--hide-scrollbars",
        "--force-device-scale-factor=1", f"--window-size={W},{H}",
        f"--screenshot={png_path}", "file:///" + svg_path.replace(os.sep, "/"),
    ], check=True, capture_output=True)
    print("wrote", os.path.basename(png_path))
print("done")
