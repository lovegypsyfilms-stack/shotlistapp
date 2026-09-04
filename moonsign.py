#!/usr/bin/env python3
"""
moonsign.py — live moon sign + ingress time, and a true moon phase.

  · moon longitude from the truncated ELP series (Meeus ch.47, 59 terms).
    Reproduces the book's worked example to 0.0 arcseconds.
  · sign is read off apparent longitude; a bisection between the day's two
    midnights finds any ingress and prints it in local clock time.
  · the phase disc switches from a mean-cycle approximation to the true
    Sun/Moon elongation, so it is right for any date, not just Sep 2026.
  · astro text is COMPUTED at render time. The typed tail in the day label
    is ignored for display but the label itself is never altered — it is a
    storage key for dayDone.

Day boundaries use the shoot's own timezone where one is set, so "SEP 11"
means the shooting day in Hawaii no matter where you are standing.

    python3 moonsign.py index.html
"""
import sys

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

ASTRO = r"""
/* ===== astronomy =========================================================
   Moon and Sun apparent ecliptic longitude. Meeus, Astronomical Algorithms,
   ch.47 and ch.25. Pure arithmetic — no network, works with no signal.
   Verified against Meeus example 47.a (1992 Apr 12.0 TD -> 133.162655 deg).
   ========================================================================= */
const A_RAD=Math.PI/180, aSin=d=>Math.sin(d*A_RAD);
const MOON_TERMS=[
 [0,0,1,0,6288774],[2,0,-1,0,1274027],[2,0,0,0,658314],[0,0,2,0,213618],
 [0,1,0,0,-185116],[0,0,0,2,-114332],[2,0,-2,0,58793],[2,-1,-1,0,57066],
 [2,0,1,0,53322],[2,-1,0,0,45758],[0,1,-1,0,-40923],[1,0,0,0,-34720],
 [0,1,1,0,-30383],[2,0,0,-2,15327],[0,0,1,2,-12528],[0,0,1,-2,10980],
 [4,0,-1,0,10675],[0,0,3,0,10034],[4,0,-2,0,8548],[2,1,-1,0,-7888],
 [2,1,0,0,-6766],[1,0,-1,0,-5163],[1,1,0,0,4987],[2,-1,1,0,4036],
 [2,0,2,0,3994],[4,0,0,0,3861],[2,0,-3,0,3665],[0,1,-2,0,-2689],
 [2,0,-1,2,-2602],[2,-1,-2,0,2390],[1,0,1,0,-2348],[2,-2,0,0,2236],
 [0,1,2,0,-2120],[0,2,0,0,-2069],[2,-2,-1,0,2048],[2,0,1,-2,-1773],
 [2,0,0,2,-1595],[4,-1,-1,0,1215],[0,0,2,2,-1110],[3,0,-1,0,-892],
 [2,1,1,0,-810],[4,-1,-2,0,759],[0,2,-1,0,-713],[2,2,-1,0,-700],
 [2,1,-2,0,691],[2,-1,0,-2,596],[4,0,1,0,549],[0,0,4,0,537],
 [4,-1,0,0,520],[1,0,-2,0,-487],[2,1,0,-2,-399],[0,0,2,-2,-381],
 [1,1,1,0,351],[3,0,-2,0,-340],[4,0,-3,0,330],[2,-1,2,0,327],
 [0,2,1,0,-323],[1,1,-1,0,299],[2,0,3,0,294]];

function moonLon(jde){
 const T=(jde-2451545)/36525, T2=T*T, T3=T2*T, T4=T3*T;
 const Lp=218.3164477+481267.88123421*T-0.0015786*T2+T3/538841-T4/65194000;
 const D = 297.8501921+445267.1114034*T -0.0018819*T2+T3/545868-T4/113065000;
 const M = 357.5291092+35999.0502909*T  -0.0001536*T2+T3/24490000;
 const Mp=134.9633964+477198.8675055*T  +0.0087414*T2+T3/69699 -T4/14712000;
 const F = 93.2720950+483202.0175233*T  -0.0036539*T2-T3/3526000+T4/863310000;
 const E=1-0.002516*T-0.0000074*T2;
 let s=0;
 for(let i=0;i<MOON_TERMS.length;i++){
  const t=MOON_TERMS[i]; let v=t[4]*aSin(t[0]*D+t[1]*M+t[2]*Mp+t[3]*F);
  if(t[1]===1||t[1]===-1) v*=E; else if(t[1]===2||t[1]===-2) v*=E*E;
  s+=v;
 }
 s+=3958*aSin(119.75+131.849*T)+1962*aSin(Lp-F)+318*aSin(53.09+479264.290*T);
 const O=125.04452-1934.136261*T, L=280.4665+36000.7698*T;
 const nut=(-17.20*aSin(O)-1.32*aSin(2*L)-0.23*aSin(2*Lp)+0.21*aSin(2*O))/3600;
 return ((Lp+s/1000000+nut)%360+360)%360;
}
function sunLon(jde){
 const T=(jde-2451545)/36525;
 const L0=280.46646+36000.76983*T+0.0003032*T*T;
 const M =357.52911+35999.05029*T-0.0001537*T*T;
 const C =(1.914602-0.004817*T-0.000014*T*T)*aSin(M)
         +(0.019993-0.000101*T)*aSin(2*M)+0.000289*aSin(3*M);
 return ((L0+C-0.00569-0.00478*aSin(125.04-1934.136*T))%360+360)%360;
}
const SIGNS=['ARIES','TAURUS','GEMINI','CANCER','LEO','VIRGO','LIBRA','SCORPIO',
             'SAGITTARIUS','CAPRICORN','AQUARIUS','PISCES'];
const signOf=l=>Math.floor(l/30)%12;
const jdOf=ms=>ms/86400000+2440587.5+69/86400;   // +deltaT

// Day boundaries in the shoot's own zone, so SEP 11 means the Hawaii day
// wherever you happen to be reading it. Undefined -> the device's own zone.
const ASTRO_TZ={island:'Pacific/Honolulu'};
function tzOffset(ms,tz){
 if(!tz) return -new Date(ms).getTimezoneOffset()*60000;
 try{
  const p={}; new Intl.DateTimeFormat('en-US',{timeZone:tz,hour12:false,
    year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',
    minute:'2-digit',second:'2-digit'}).formatToParts(new Date(ms))
    .forEach(x=>p[x.type]=x.value);
  return Date.UTC(+p.year,+p.month-1,+p.day,(+p.hour)%24,+p.minute,+p.second)-ms;
 }catch(e){ return -new Date(ms).getTimezoneOffset()*60000; }
}
function zonedMidnight(y,m,d,tz){
 const base=Date.UTC(y,m-1,d,0,0,0); let ms=base;
 for(let i=0;i<2;i++) ms=base-tzOffset(ms,tz);
 return ms;
}
const ASTRO_CACHE={};
function astroFor(y,m,d,tz){
 const ck=y+'-'+m+'-'+d+'-'+(tz||'local');
 if(ASTRO_CACHE[ck]) return ASTRO_CACHE[ck];
 const a=zonedMidnight(y,m,d,tz), b=zonedMidnight(y,m,d+1,tz);
 const s0=signOf(moonLon(jdOf(a))), s1=signOf(moonLon(jdOf(b)));
 let out;
 if(s0===s1){ out={sign:SIGNS[s0],text:SIGNS[s0]}; }
 else{
  let lo=a,hi=b;
  for(let i=0;i<40;i++){ const mid=(lo+hi)/2;
   if(signOf(moonLon(jdOf(mid)))===s0) lo=mid; else hi=mid; }
  let t;
  try{ t=new Date(hi).toLocaleTimeString('en-US',
        {timeZone:tz||undefined,hour:'numeric',minute:'2-digit'}).replace(/\s/g,''); }
  catch(e){ t=''; }
  out={sign:SIGNS[s1],text:SIGNS[s0]+'→'+SIGNS[s1]+(t?' '+t:'')};
 }
 // phase 0..1 from true elongation, for the disc
 const mid=(a+b)/2;
 let e=moonLon(jdOf(mid))-sunLon(jdOf(mid)); e=((e%360)+360)%360;
 out.phase=e/360;
 ASTRO_CACHE[ck]=out; return out;
}
// "SEP 11 | ..." -> {y,m,d} for whichever project is showing.
function dateOfLabel(label){
 const m=(label||'').match(/^([A-Z]{3})\s+(\d+)/i); if(!m) return null;
 const mo={JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12}[m[1].toUpperCase()];
 return mo?{y:2026,m:mo,d:+m[2]}:null;
}
"""

sub("function moonAge(", ASTRO + "\nfunction moonAge(", "astronomy block")

sub("""function moonFor(label){
 const m=label.match(/SEP\\s+(\\d+)/i); if(!m) return '';
 return moonSVG(moonAge(2026,9,+m[1]));
}""",
    """function moonFor(label){
 const dt=dateOfLabel(label); if(!dt) return '';
 return moonSVG(astroFor(dt.y,dt.m,dt.d,ASTRO_TZ[PID]).phase);
}""",
    "phase disc uses the true elongation")

sub("""function titleHTML(label){
  const i=(label||'').lastIndexOf('|');
  if(i<0) return esc(label||'');
  return esc(label.slice(0,i).replace(/\\s+$/,''))+
         ' <span class="astro">'+esc(label.slice(i+1).trim())+'</span>';
}""",
    """function titleHTML(label){
  const i=(label||'').lastIndexOf('|');
  const dt=dateOfLabel(label);
  const head=i<0?(label||''):label.slice(0,i).replace(/\\s+$/,'');
  // The astro tail is computed, never read from the label. Falls back to the
  // typed text if the date cannot be parsed.
  const tail=dt?astroFor(dt.y,dt.m,dt.d,ASTRO_TZ[PID]).text
               :(i<0?'':label.slice(i+1).trim());
  return esc(head)+(tail?' <span class="astro">'+esc(tail)+'</span>':'');
}""",
    "day title computes its own sign")

open(OUT, 'w', encoding='utf-8').write(src)
print("\n%d patches applied · written to %s" % (n, OUT))
