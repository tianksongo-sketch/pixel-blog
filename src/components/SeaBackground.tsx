"use client";
import { useEffect, useRef } from "react";
import { calmNow } from "@/lib/motion";

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const rnd = lcg(20261125);
const STARS = Array.from({ length: 72 }, () => ({
  x: +(rnd() * 100).toFixed(2),
  y: +(rnd() * 46).toFixed(2),
  s: rnd() < 0.82 ? 1 : 2,
  d: +(rnd() * 7).toFixed(2),
  o: +(0.25 + rnd() * 0.75).toFixed(2)
}));
const SHOOTS = [
  { x: 76, y: 6, d: 0 },
  { x: 34, y: 3, d: 6 },
  { x: 58, y: 12, d: 11 }
];

const WAVE =
  "M0 60 C120 20 240 20 360 60 C480 100 600 100 720 60 " +
  "C840 20 960 20 1080 60 C1200 100 1320 100 1440 60 " +
  "C1560 20 1680 20 1800 60 C1920 100 2040 100 2160 60 " +
  "C2280 20 2400 20 2520 60 C2640 100 2760 100 2880 60 L2880 120 L0 120 Z";

const SEA_CSS = `
:root{--sea-t:1}
:root[data-lebay="on"]{--sea-t:.55}

/* KUNCI: badan halaman harus transparan supaya laut di belakang terlihat. */
html{background:var(--canvas,#000)}
body{background:transparent!important}
body::before{display:none!important}

.sea{
  position:fixed;inset:0;z-index:-2;overflow:hidden;pointer-events:none;
  --w1:rgba(255,255,255,.06);--w2:rgba(255,255,255,.11);--w3:rgba(255,255,255,.19);
  --orb:#FFFFFF;--orb-glow:rgba(255,255,255,.30);
  --sky1:#000000;--sky2:#04060C;--sea1:#020409;--sea2:#000000;
  --star:#FFFFFF;--refl:rgba(255,255,255,.30);--foam:rgba(255,255,255,.55);
  background:linear-gradient(180deg,var(--sky1) 0%,var(--sky2) 46%,var(--sea1) 47%,var(--sea2) 100%);
  transform:translate3d(var(--sx,0px),var(--sy,0px),0);
  transition:transform .9s cubic-bezier(.16,1,.3,1);
}
:root[data-mode="light"] .sea{
  --w1:rgba(0,0,0,.05);--w2:rgba(0,0,0,.09);--w3:rgba(0,0,0,.15);
  --orb:#000000;--orb-glow:rgba(0,0,0,.14);
  --sky1:#FFFFFF;--sky2:#EDF1F5;--sea1:#E4E9EE;--sea2:#F7F9FB;
  --star:#000000;--refl:rgba(0,0,0,.20);--foam:rgba(0,0,0,.42);
}
@media (prefers-color-scheme: light){
  :root:not([data-mode="dark"]) .sea{
    --w1:rgba(0,0,0,.05);--w2:rgba(0,0,0,.09);--w3:rgba(0,0,0,.15);
    --orb:#000000;--orb-glow:rgba(0,0,0,.14);
    --sky1:#FFFFFF;--sky2:#EDF1F5;--sea1:#E4E9EE;--sea2:#F7F9FB;
    --star:#000000;--refl:rgba(0,0,0,.20);--foam:rgba(0,0,0,.42);
  }
}

.sea-orb{
  position:absolute;right:13%;top:15%;
  width:clamp(64px,11vw,124px);aspect-ratio:1;border-radius:50%;
  background:var(--orb);
  box-shadow:0 0 70px 22px var(--orb-glow);
  animation:sea-bob calc(16s * var(--sea-t)) ease-in-out infinite alternate;
}
@keyframes sea-bob{from{transform:translateY(-6px)}to{transform:translateY(8px)}}

.sea-horizon{position:absolute;left:0;right:0;top:47%;height:1px;background:var(--foam);opacity:.45}

.sea-stars{position:absolute;inset:0 0 53% 0}
.sea-stars i{position:absolute;border-radius:50%;background:var(--star);animation:sea-twinkle calc(4.5s * var(--sea-t)) ease-in-out infinite}
@keyframes sea-twinkle{0%,100%{opacity:.12;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}
:root[data-mode="light"] .sea-stars,:root[data-mode="light"] .sea-shoot{display:none}
@media (prefers-color-scheme: light){
  :root:not([data-mode="dark"]) .sea-stars,:root:not([data-mode="dark"]) .sea-shoot{display:none}
}

.sea-shoot{
  position:absolute;width:150px;height:1.5px;border-radius:999px;
  background:linear-gradient(90deg,transparent,var(--star));
  transform:rotate(158deg);opacity:0;
  animation:sea-shoot calc(13s * var(--sea-t)) linear infinite;
}
@keyframes sea-shoot{
  0%{opacity:0;translate:0 0}
  3%{opacity:.9}
  12%{opacity:0;translate:-46vw 20vw}
  100%{opacity:0;translate:-46vw 20vw}
}

.sea-water{position:absolute;left:0;right:0;top:47%;bottom:0;overflow:hidden}
.sea-wave{position:absolute;left:0;width:200%;height:42%}
.sea-wave svg{display:block;width:100%;height:100%}
.sea-wave path{fill:currentColor}
.sea-wave.w1{top:-8%;color:var(--w1);animation:sea-drift calc(30s * var(--sea-t)) linear infinite}
.sea-wave.w2{top:4%;color:var(--w2);animation:sea-drift calc(21s * var(--sea-t)) linear infinite reverse}
.sea-wave.w3{top:16%;color:var(--w3);animation:sea-drift calc(14s * var(--sea-t)) linear infinite}
@keyframes sea-drift{from{transform:translateX(0)}to{transform:translateX(-50%)}}

.sea-reflect{
  position:absolute;right:13%;top:47%;width:clamp(36px,6.5vw,74px);height:44%;
  transform:translateX(50%);
  background:linear-gradient(180deg,var(--refl),transparent 82%);
  filter:blur(5px);
  -webkit-mask-image:repeating-linear-gradient(180deg,#000 0 5px,transparent 5px 11px);
  mask-image:repeating-linear-gradient(180deg,#000 0 5px,transparent 5px 11px);
  animation:sea-shimmer calc(6s * var(--sea-t)) ease-in-out infinite alternate;
}
@keyframes sea-shimmer{from{opacity:.5;transform:translateX(50%) scaleX(.9)}to{opacity:.95;transform:translateX(50%) scaleX(1.12)}}

:root[data-motion="reduce"] .sea *{animation:none!important}
@media (prefers-reduced-motion: reduce){.sea *{animation:none!important}}
`;

export function SeaBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || calmNow() || window.matchMedia("(hover: none)").matches) return;
    let raf = 0;
    let tx = 0, ty = 0;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * -14;
      ty = (e.clientY / window.innerHeight - 0.5) * -8;
      if (!raf) raf = requestAnimationFrame(() => {
        raf = 0;
        el.style.setProperty("--sx", tx.toFixed(1) + "px");
        el.style.setProperty("--sy", ty.toFixed(1) + "px");
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { window.removeEventListener("pointermove", onMove); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SEA_CSS }} />
      <div className="sea" ref={ref} aria-hidden="true">
        <div className="sea-stars">
          {STARS.map((s, i) => (
            <i key={i} style={{ left: s.x + "%", top: s.y + "%", width: s.s, height: s.s, opacity: s.o, animationDelay: s.d + "s" }} />
          ))}
        </div>
        {SHOOTS.map((s, i) => (
          <span key={i} className="sea-shoot" style={{ left: s.x + "%", top: s.y + "%", animationDelay: s.d + "s" }} />
        ))}
        <div className="sea-orb" />
        <div className="sea-horizon" />
        <div className="sea-water">
          <div className="sea-wave w1"><svg viewBox="0 0 2880 120" preserveAspectRatio="none"><path d={WAVE} /></svg></div>
          <div className="sea-wave w2"><svg viewBox="0 0 2880 120" preserveAspectRatio="none"><path d={WAVE} /></svg></div>
          <div className="sea-wave w3"><svg viewBox="0 0 2880 120" preserveAspectRatio="none"><path d={WAVE} /></svg></div>
          <div className="sea-reflect" />
        </div>
      </div>
    </>
  );
}
