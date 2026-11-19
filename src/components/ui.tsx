"use client";
import { motion, AnimatePresence, useDragControls } from "motion/react";
import { createPortal } from "react-dom";
import { useEffect, useRef, type ReactNode, type PointerEvent as RPointerEvent, type ButtonHTMLAttributes } from "react";
import { clamp, reducedMotion } from "@/lib/utils";
import { overlayEnter, overlayLeave, suppressNextPop } from "@/lib/overlay";

export const SPRING = { type: "spring" as const, stiffness: 300, damping: 24, mass: 1 };
export const SPRING_SOFT = { type: "spring" as const, stiffness: 240, damping: 30, mass: 1.1 };
export const SPRING_SNAPPY = { type: "spring" as const, stiffness: 620, damping: 34, mass: 0.8 };

/* Back di HP menutup overlay dulu, bukan pindah halaman. */
function useOverlayHistory(open: boolean, onClose: () => void) {
  const pushed = useRef(false);
  const openedAt = useRef("");
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    openedAt.current = window.location.pathname + window.location.search;
    overlayEnter();
    try {
      window.history.pushState({ ...(window.history.state || {}), pxOverlay: 1 }, "");
      pushed.current = true;
    } catch { /* abaikan */ }

    const onPop = () => {
      if (!pushed.current) return;
      pushed.current = false;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
      overlayLeave();
      if (pushed.current) {
        pushed.current = false;
        const sameUrl = openedAt.current === window.location.pathname + window.location.search;
        if (sameUrl) {
          suppressNextPop();
          try { window.history.back(); } catch { /* abaikan */ }
        }
      }
    };
  }, [open]);
}

export function Icon({ name, fill = false, size = 24, className = "", weight = 400 }: {
  name: string; fill?: boolean; size?: number; className?: string; weight?: number;
}) {
  return (
    <span aria-hidden="true" className={`ms${fill ? " ms-fill" : ""} ${className}`}
      style={{ fontSize: size, ...(fill ? {} : { fontVariationSettings: `"FILL" 0, "wght" ${weight}, "GRAD" 0, "opsz" 24` }) }}>
      {name}
    </span>
  );
}

export function attachRipple(ev: RPointerEvent<HTMLElement>) {
  if (reducedMotion()) return;
  const el = ev.currentTarget;
  const rect = el.getBoundingClientRect();
  const d = Math.max(rect.width, rect.height) * 2;
  const span = document.createElement("span");
  span.className = "ripple";
  span.style.width = span.style.height = `${d}px`;
  span.style.left = `${ev.clientX - rect.left - d / 2}px`;
  span.style.top = `${ev.clientY - rect.top - d / 2}px`;
  el.appendChild(span);
  span.addEventListener("animationend", () => span.remove());
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "filled" | "tonal" | "text" | "outlined" | "elevated" | "icon" };
export function Btn({ variant = "text", className = "", children, onPointerDown, ...rest }: BtnProps) {
  return (
    <button className={`btn b-${variant} ${className}`} onPointerDown={(e) => { attachRipple(e); onPointerDown?.(e); }} {...rest}>
      {children}
    </button>
  );
}

export function Dialog({ open, onClose, title, icon, text, children, actions }: {
  open: boolean; onClose: () => void; title: string; icon?: string; text?: string; children?: ReactNode; actions: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useOverlayHistory(open, onClose);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => ref.current?.focus(), 80);
    return () => { document.removeEventListener("keydown", onKey); clearTimeout(t); };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" style={{ zIndex: 69 }}
            initial={{ opacity: 0 }} animate={{ opacity: 0.32 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.05, 0.7, 0.1, 1] }} onClick={onClose} />
          <div className="dialog-wrap">
            <motion.div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="dialog"
              initial={{ opacity: 0, scale: 0.82, y: 34 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 18, transition: { duration: 0.2, ease: [0.3, 0, 0.8, 0.15] } }}
              transition={SPRING}>
              {icon && <div className="dialog-icon"><Icon name={icon} size={28} /></div>}
              <h2 className="dialog-title">{title}</h2>
              {text && <p className="dialog-text">{text}</p>}
              {children && <div className="dialog-body">{children}</div>}
              <div className="dialog-actions">{actions}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const controls = useDragControls();
  useOverlayHistory(open, onClose);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim"
            initial={{ opacity: 0 }} animate={{ opacity: 0.32 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.34, ease: [0.05, 0.7, 0.1, 1] }} onClick={onClose} />
          <motion.div className="sheet" role="dialog" aria-modal="true" aria-label={title}
            drag="y" dragListener={false} dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.55 }} dragMomentum={false}
            onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 600) onClose(); }}
            initial={{ y: "100%" }} animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.26, ease: [0.3, 0, 0.8, 0.15] } }}
            transition={SPRING_SOFT}>
            <div className="sheet-handle" onPointerDown={(e) => controls.start(e)}><span /></div>
            <div className="sheet-title">{title}</div>
            <div className="sheet-body">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function RollingNumber({ value }: { value: number }) {
  const digits = String(Math.max(0, value)).split("");
  return (
    <span className="roll" aria-label={String(value)}>
      {digits.map((d, i) => (
        <span className="roll-col" key={digits.length - i}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={d} className="roll-digit"
              initial={{ y: "0.95em", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "-0.95em", opacity: 0 }}
              transition={SPRING_SNAPPY}>{d}</motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initial = (name.trim()[0] || "?").toUpperCase();
  const n = 12, cx = 24, cy = 24, ro = 19.5, ri = 17;
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? ro : ri;
    const a = (Math.PI * i) / n - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return (
    <svg className="avatar" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <polygon points={pts.join(" ")} fill="var(--md-secondary-container)" stroke="var(--md-secondary-container)" strokeWidth="5" strokeLinejoin="round" />
      <text x="24" y="25.5" textAnchor="middle" dominantBaseline="middle" fill="var(--md-on-secondary-container)" fontSize="19" fontWeight="700" fontFamily="inherit">{initial}</text>
    </svg>
  );
}

export function Skel({ h = 16, w = "100%", r = 16, className = "" }: { h?: number; w?: string | number; r?: number; className?: string }) {
  return <div className={`skel ${className}`} style={{ height: h, width: w, borderRadius: r }} />;
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label}
      className={`switch${checked ? " on" : ""}`} onClick={() => onChange(!checked)}>
      <motion.span className="knob" layout transition={SPRING_SNAPPY}>
        {checked && <Icon name="check" size={16} weight={600} />}
      </motion.span>
    </button>
  );
}

export function LabelChip({ label, onClick, active = false, onRemove }: { label: string; onClick?: () => void; active?: boolean; onRemove?: () => void }) {
  if (onRemove) {
    return (
      <span className="label-chip solid">
        {label}
        <button type="button" className="chip-x" aria-label={`Hapus label ${label}`} onClick={onRemove}>
          <Icon name="close" size={16} />
        </button>
      </span>
    );
  }
  return (
    <button type="button" className={`label-chip${active ? " active" : ""}`} onPointerDown={attachRipple} onClick={onClick} aria-pressed={active}>
      {active && <Icon name="check" size={18} weight={600} />}
      {label}
    </button>
  );
}

export function useParallax<T extends HTMLElement>(strength = 10) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: "100px" });
    io.observe(el);
    const update = () => {
      raf = 0;
      if (!visible) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const p = clamp((r.top + r.height / 2 - vh / 2) / vh, -1, 1);
      el.style.transform = `translate3d(0, ${(p * strength).toFixed(1)}px, 0) scale(1.08)`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [strength]);
  return ref;
}
