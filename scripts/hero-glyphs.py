# Cuts the hero name's letters (ANDREW LIU) out of the Fira Code the site serves, at weight 700,
# as SVG path data for the pencil's write-on (components/site/hero-write.tsx). Re-run if the
# name or the font changes:  python scripts/hero-glyphs.py
# Coordinates are font units with y flipped to point down and 0 at the line box's top, for the
# site's .display line-height of .84, so a path drops straight onto its letter's box.
import glob, json, pathlib
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

root = pathlib.Path(__file__).resolve().parent.parent
src = sorted(glob.glob(str(root / '.vinext/fonts/fira-code-*/fira-code-bdcbd067.woff2')))[0]
font = instantiateVariableFont(TTFont(src), {'wght': 700})
upm = font['head'].unitsPerEm
os2, hhea = font['OS/2'], font['hhea']
typo = bool(os2.fsSelection & (1 << 7))
asc, desc = (os2.sTypoAscender, -os2.sTypoDescender) if typo else (os2.usWinAscent, os2.usWinDescent)
line = .84 * upm
base = (line - (asc + desc)) / 2 + asc  # the baseline, down from the line box's top
gs, cmap = font.getGlyphSet(), font.getBestCmap()
out = {'upm': upm, 'line': round(line, 1), 'glyphs': {}}
for ch in sorted(set('ANDREWLIU')):
    name = cmap[ord(ch)]
    pen = SVGPathPen(gs, ntos=lambda v: f'{v:.0f}')
    gs[name].draw(TransformPen(pen, (1, 0, 0, -1, 0, base)))
    out['glyphs'][ch] = {'adv': gs[name].width, 'd': pen.getCommands()}
dest = root / 'components/site/hero-glyphs.json'
dest.write_text(json.dumps(out, separators=(',', ':')))
print(f'wrote {dest.name}: upm {upm}, baseline {base / upm:.3f}em ({"typo" if typo else "win"} metrics), {dest.stat().st_size} bytes')
