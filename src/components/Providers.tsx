"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { applyThemeDom, updateThemeMetas, type Mode } from "@/lib/theme";
import { reducedMotion } from "@/lib/utils";
import { Btn, Dialog, Icon, Sheet } from "./ui";
import { ThemeFab } from "./ThemeFab";

export type AppState = {
  seed: string; mode: Mode; consent: string | null; name: string | null; hasVid: boolean;
  setTheme: (seed: string, origin?: { x: number; y: number }) => void;
  setMode: (m: Mode) => void;
  snack: (msg: string) => void;
  allowConsent: () => Promise<boolean>;
  denyConsent: () => void;
  requireConsent: (run: () => void) => void;
  saveName: (n: string) => Promise<"ok" | "consent" | "error">;
};

const Ctx = createContext<AppState | null>(null);
export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp di luar Providers");
  return v;
}

type Initial = { seed: string; mode: Mode; consent: string | null; name: string | null; hasVid: boolean };

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export function Providers({ initial, children }: { initial: Initial; children: ReactNode }) {
  const router = useRouter();
  const [seed, setSeed] = useState(initial.seed);
  const [mode, setModeState] = useState<Mode>(initial.mode);
  const [consent, setConsent] = useState<string | null>(initial.consent);
  const [name, setName] = useState<string | null>(initial.name);
  const [hasVid, setHasVid] = useState(initial.hasVid);
  const [snackMsg, setSnackMsg] = useState<{ msg: string; id: number } | null>(null);
  const [consentSheet, setConsentSheet] = useState(false);
  const [consentDlg, setConsentDlg] = useState(false);
  const pendingRef = useRef<(() => void) | null>(null);
  const seedRef = useRef(seed);
  seedRef.current = seed;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const snack = useCallback((msg: string) => setSnackMsg({ msg, id: Date.now() }), []);

  useEffect(() => {
    if (!snackMsg) return;
    const t = setTimeout(() => setSnackMsg(null), 3400);
    return () => clearTimeout(t);
  }, [snackMsg]);

  /* Snackbar izin cookie kunjungan pertama */
  useEffect(() => {
    if (initial.consent !== null) return;
    const t = setTimeout(() => setConsentSheet(true), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Meta theme-color mengikuti skema aktif */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => updateThemeMetas(seedRef.current, modeRef.current);
    mq.addEventListener("change", onChange);
    updateThemeMetas(seedRef.current, modeRef.current);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /* Shortcut rahasia admin: Ctrl/Cmd + Shift + A */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault();
        router.push("/admin");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const allowConsent = useCallback(async (): Promise<boolean> => {
    try {
      const r = await postJson("/api/consent", { allow: true, seed: seedRef.current });
      if (!r.ok) throw new Error();
      setConsent("1");
      setHasVid(true);
      return true;
    } catch {
      snack("Gagal menyimpan preferensi, coba lagi ya");
      return false;
    }
  }, [snack]);

  const denyConsent = useCallback(() => {
    setConsent("0");
    postJson("/api/consent", { allow: false }).catch(() => {});
  }, []);

  const requireConsent = useCallback((run: () => void) => {
    if (hasVid) { run(); return; }
    pendingRef.current = run;
    setConsentDlg(true);
  }, [hasVid]);

  const saveName = useCallback(async (n: string): Promise<"ok" | "consent" | "error"> => {
    try {
      const r = await postJson("/api/name", { name: n });
      if (r.status === 403) return "consent";
      if (!r.ok) return "error";
      setName(n);
      return "ok";
    } catch { return "error"; }
  }, []);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    applyThemeDom(seedRef.current, m);
    postJson("/api/theme", { seed: seedRef.current, mode: m }).catch(() => {});
  }, []);

  const setTheme = useCallback((next: string, origin?: { x: number; y: number }) => {
    const apply = () => {
      applyThemeDom(next, modeRef.current);
      setSeed(next);
      postJson("/api/theme", { seed: next, mode: modeRef.current }).catch(() => {});
    };
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> } };
    if (!reducedMotion() && doc.startViewTransition && origin) {
      const { x, y } = origin;
      const root = document.documentElement;
      root.classList.add("vt-theme");
      const vt = doc.startViewTransition(apply);
      vt.ready.then(() => {
        const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
          { duration: 600, easing: "cubic-bezier(0.2,0,0,1)", pseudoElement: "::view-transition-new(root)" } as KeyframeAnimationOptions
        );
      }).catch(() => {});
      vt.finished.finally(() => root.classList.remove("vt-theme"));
    } else {
      const root = document.documentElement;
      root.classList.add("theme-fade");
      apply();
      setTimeout(() => root.classList.remove("theme-fade"), 550);
    }
  }, []);

  const state: AppState = { seed, mode, consent, name, hasVid, setTheme, setMode, snack, allowConsent, denyConsent, requireConsent, saveName };

  return (
    <Ctx.Provider value={state}>
      <MotionConfig reducedMotion="user">
        {children}
        <ThemeFab />

        {/* Snackbar */}
        <AnimatePresence>
          {snackMsg && (
            <motion.div key={snackMsg.id} className="snackbar" role="status"
              initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={{ type: "spring", stiffness: 560, damping: 34 }}>
              <Icon name="check_circle" size={20} />
              {snackMsg.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Consent kunjungan pertama */}
        <Sheet open={consentSheet} onClose={() => { denyConsent(); setConsentSheet(false); }} title="Cookie dulu, ya?">
          <p style={{ color: "var(--md-on-surface-variant)", fontSize: 14.5 }}>
            Izinkan cookie untuk menyimpan warna, nama, dan like kamu?
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
            <Btn variant="text" onClick={() => { denyConsent(); setConsentSheet(false); }}>Tolak</Btn>
            <Btn variant="filled" onClick={async () => { const ok = await allowConsent(); setConsentSheet(false); if (ok) snack("Siap! Warna & namamu akan diingat"); }}>Izinkan</Btn>
          </div>
        </Sheet>

        {/* Dialog izin saat like/komentar tanpa cookie */}
        <Dialog
          open={consentDlg} onClose={() => { setConsentDlg(false); pendingRef.current = null; }}
          icon="cookie" title="Butuh izin cookie"
          text="Untuk like dan komentar, kami perlu cookie kecil supaya satu orang satu like dan namamu diingat. Boleh?"
          actions={<>
            <Btn variant="text" onClick={() => { setConsentDlg(false); pendingRef.current = null; }}>Nanti saja</Btn>
            <Btn variant="filled" onClick={async () => {
              const ok = await allowConsent();
              setConsentDlg(false);
              if (ok) { snack("Cookie diizinkan"); const run = pendingRef.current; pendingRef.current = null; run?.(); }
            }}>Izinkan</Btn>
          </>}
        />
      </MotionConfig>
    </Ctx.Provider>
  );
}
