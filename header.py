#!/usr/bin/env python3
"""
header.py — SHOTLINE header.

  · brand mark + SHOTLINE / LOVE GYPSY FILMS at top left
  · project pills move up onto the same row, right-aligned
  · day tabs move INSIDE the black header, so the black runs
    behind them and the light canvas starts at the location tabs
  · the astro part of a day label (VIRGO/LIBRA) renders smaller
    than the date and weekday — ancillary, but still readable

Nothing below the location tabs is touched. No ids change.

    python3 header.py index.html
"""
import re, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
OUT = sys.argv[2] if len(sys.argv) > 2 else SRC
src = open(SRC, encoding='utf-8').read()
n = 0

def sub(old, new, why):
    global src, n
    if new in src:
        print("  · already present: %s" % why); return
    if src.count(old) != 1:
        raise SystemExit("PATCH FAILED — %d matches for: %s" % (src.count(old), why))
    src = src.replace(old, new, 1); n += 1
    print("  ✓ %s" % why)

# ---------------------------------------------------------------- 1. styles
sub(".progressbar{height:3px;",
    """.brandRow{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 11px}
.brand{display:flex;align-items:center;gap:9px;min-width:0}
.brandMark{width:29px;height:29px;flex:0 0 auto}
.brandName{font-size:17px;font-weight:950;letter-spacing:.05em;line-height:1}
.brandSub{font-size:7px;font-weight:800;letter-spacing:.17em;color:#8a8a83;margin-top:3px;line-height:1}
.daytitle .astro{font-size:11px;font-weight:900;letter-spacing:.05em;color:#a5a59d}
.top .daytabs{background:transparent;padding:10px 0 0;margin:10px 0 0}
.top .daytabs button{background:#1e1e1c;color:#d5d5cf}
.top .daytabs button.on{background:#faf9f5;color:#111}
.top .daytabs .dayFill b{background:rgba(255,255,255,.16)}
.top .daytabs button.on .dayFill b{background:rgba(0,0,0,.13)}
.top .daytabs button.on .dayFill.f1 b.on{background:#e07a35}
.top .daytabs button.on .dayFill.f2 b.on{background:#e8b53a}
.top .daytabs button.on .dayFill.f3 b.on{background:#3fae5a}
.progressbar{height:3px;""",
    "brand + dark day-tab styles")

sub(".projRow{display:flex;gap:4px;margin:0 0 9px}",
    ".projRow{display:flex;gap:4px;margin:0;flex:0 0 auto}",
    "pills no longer own a row of their own")

# ---------------------------------------------------------------- 2. markup
sub("""  <header class="top">
    <nav class="projRow" id="projRow" aria-label="Projects">""",
    """  <header class="top">
    <div class="brandRow">
      <div class="brand">
        <svg class="brandMark" viewBox="0 0 40 40" aria-hidden="true">
          <path d="M5 5h30v30H5z" fill="none" stroke="#fff" stroke-width="2.6"/>
          <path d="M10 30L30 10" stroke="#fff" stroke-width="2.6"/>
          <path d="M10 10h11L10 21z" fill="#fff"/>
        </svg>
        <div>
          <div class="brandName">SHOTLINE</div>
          <div class="brandSub">LOVE GYPSY FILMS</div>
        </div>
      </div>
    <nav class="projRow" id="projRow" aria-label="Projects">""",
    "brand block")

sub("""    </nav>
    <div class="dayrow">""",
    """    </nav>
    </div>
    <div class="dayrow">""",
    "close the brand row")

sub("""  </header>
  <nav class="daytabs" id="dayTabs" aria-label="Shoot days"></nav>""",
    """    <nav class="daytabs" id="dayTabs" aria-label="Shoot days"></nav>
  </header>""",
    "day tabs moved onto the black")

# ---------------------------------------------------------------- 3. title
sub("function moonFor(",
    """// "SEP 11 | FRIDAY | VIRGO/LIBRA" -> the astro tail renders smaller.
// Labels with no pipe (SHED, PREP) are returned untouched. The label itself
// is never altered — it is a storage key for dayDone.
function titleHTML(label){
  const i=(label||'').lastIndexOf('|');
  if(i<0) return esc(label||'');
  return esc(label.slice(0,i).replace(/\\s+$/,''))+
         ' <span class="astro">'+esc(label.slice(i+1).trim())+'</span>';
}
function moonFor(""",
    "titleHTML helper")

sub("$('dayTitle').innerHTML=day.label+moonFor(day.label);",
    "$('dayTitle').innerHTML=titleHTML(day.label)+moonFor(day.label);",
    "day title uses it")

open(OUT, 'w', encoding='utf-8').write(src)
print("\n%d patches applied · written to %s" % (n, OUT))
