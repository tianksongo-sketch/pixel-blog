"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { applyThemeDom, updateThemeMetas, type Mode } from "@/lib/theme";
import { reducedMotion } from "@/lib/utils";
import { Btn, Dialog, Icon, Sheet } from "./ui";

export type AdminTapTarget = "brand" | "glance";

export type AppState = {
  seed: string; mode: Mode; consent: string | null; name: string | null; hasVid: boolean;
  adminUi: boolean;
  setTheme: (seed: string, origin?: { x: number; y: number }) => void;
  setMode: (m: Mode) => void;
  snack: (msg: string) => void;
  allowConsent: () => Promise<boolean>;
  denyConsent: () => void;
  requireConsent: (run: () => void) => void;
  saveName: (n: string) => Promise<"ok" | "consent" | "error">;
  registerAdminTap: (target: AdminTapTarget) => void;
  lockAdminUi: () => void;
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

const ERR = /gagal|tidak bisa|menolak|error|salah|terlalu/i;
const ADMIN_KEY = "px:adminui";
const WINDOW_MS = 10000;

export function Providers({ initial, children }: { initial: Initial; children: ReactNode }) {
  const router = useRouter();
  const [mode, setModeState] = useState<Mode>(initial.mode);
  const [consent, setConsent] = useState<string | null>(initial.consent);
  const [name, setName] = useState<string | null>(initial.name);
  const [hasVid, setHasVid] = useState(initial.hasVid);
  const [adminUi, setAdminUi] = useState(false);
  const [snackMsg, setSnackMsg] = useState<{ msg: string; id: number } | null>(null);
  const [consentSheet, setConsentSheet] = useState(false);
  const [consentDlg, setConsentDlg] = useState(false);
  const pendingRef = useRef<(() => void) | null>(null);
  const modeRef = useRef(mode); modeRef.current = mode;
  const adminRef = useRef(adminUi); adminRef.current = adminUi;
  const tapsRef = useRef<Array<{ t: AdminTapTarget; at: number }>>([]);

  const snack = useCallback((msg: string) => setSnackMsg({ msg, id: Date.now() }), []);

  useEffect(() => {
    if (!snackMsg) return;
    const t = setTimeout(() => setSnackMsg(null), 3200);
    return () => clearTimeout(t);
  }, [snackMsg]);

  useEffect(() => {
    try { if (localStorage.getItem(ADMIN_KEY) === "1") setAdminUi(true); } catch {}
  }, []);

  useEffect(() => {
    if (initial.consent !== null) return;
    const t = setTimeout(() => setConsentSheet(true), 1400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => updateThemeMetas("mono", modeRef.current);
    mq.addEventListener("change", onChange);
    updateThemeMetas("mono", modeRef.current);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault(); router.push("/admin");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const allowConsent = useCallback(async (): Promise<boolean> => {
    try {
      const r = await postJson("/api/consent", { allow: true, seed: "mono" });
      if (!r.ok) throw new Error();
      setConsent("1"); setHasVid(true); return true;
    } catch { snack("Gagal menyimpan preferensi, coba lagi ya"); return false; }
  }, [snack]);

  const denyConsent = useCallback(() => {
    setConsent("0");
    postJson("/api/consent", { allow: false }).catch(() => {});
  }, []);

  const requireConsent = useCallback((run: () => void) => {
    if (hasVid) { run(); return; }
    pendingRef.current = run; setConsentDlg(true);
  }, [hasVid]);

  const saveName = useCallback(async (n: string): Promise<"ok" | "consent" | "error"> => {
    try {
      const r = await postJson("/api/name", { name: n });
      if (r.status === 403) return "consent";
      if (!r.ok) return "error";
      setName(n); return "ok";
    } catch { return "error"; }
  }, []);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    applyThemeDom("mono", m);
    postJson("/api/theme", { seed: "mono", mode: m }).catch(() => {});
  }, []);

  const setTheme = useCallback((_next: string, _origin?: { x: number; y: number }) => {
    applyThemeDom("mono", modeRef.current);
  }, []);

  const registerAdminTap = useCallback((target: AdminTapTarget) => {
    const now = Date.now();
    const fresh = tapsRef.current.filter((x) => now - x.at <= WINDOW_MS);
    fresh.push({ t: target, at: now });
    tapsRef.current = fresh.slice(-8);
    const l4 = tapsRef.current.slice(-4);
    const ok = l4.length === 4 && l4[0].t === "brand" && l4[1].t === "brand"
      && l4[2].t === "glance" && l4[3].t === "glance" && l4[3].at - l4[0].at <= WINDOW_MS;
    if (ok) {
      tapsRef.current = [];
      if (adminRef.current) { snack("Mode admin sudah aktif"); return; }
      setAdminUi(true);
      try { localStorage.setItem(ADMIN_KEY, "1"); } catch {}
      try { navigator.vibrate?.([12, 40, 18]); } catch {}
      snack("Anda sekarang telah menjadi admin");
      return;
    }
    const l2 = tapsRef.current.slice(-2);
    if (l2.length === 2 && l2.every((x) => x.t === "brand") && !adminRef.current) {
      snack("Sekarang ketuk “Sekilas” 2×");
    }
  }, [snack]);

  const lockAdminUi = useCallback(() => {
    setAdminUi(false); tapsRef.current = [];
    try { localStorage.removeItem(ADMIN_KEY); } catch {}
    snack("Mode admin dikunci");
  }, [snack]);

  const state = useMemo<AppState>(() => ({
    seed: "mono", mode, consent, name, hasVid, adminUi,
    setTheme, setMode, snack, allowConsent, denyConsent, requireConsent, saveName, registerAdminTap, lockAdminUi
  }), [mode, consent, name, hasVid, adminUi, setTheme, setMode, snack, allowConsent, denyConsent, requireConsent, saveName, registerAdminTap, lockAdminUi]);

  const bad = !!snackMsg && ERR.test(snackMsg.msg);

  return (
    <Ctx.Provider value={state}>
      <MotionConfig reducedMotion="user">
        {children}

        <AnimatePresence>
          {snackMsg && (
            <motion.div key={snackMsg.id} className="snackbar gl gl-rim" role={bad ? "alert" : "status"}
              initial={{ opacity: 0, y: -22, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: .96 }} transition={{ type: "spring", stiffness: 420, damping: 30 }}>
              <Icon name={bad ? "error" : "check_circle"} size={19} />
              {snackMsg.msg}
            </motion.div>
          )}
        </AnimatePresence>

        <Sheet open={consentSheet} onClose={() => { denyConsent(); setConsentSheet(false); }} title="Cookie dulu, ya?">
          <p style={{ color: "var(--ink2)", fontSize: 14.5 }}>
            Izinkan cookie untuk menyimpan nama dan suka kamu?
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
            <Btn variant="text" onClick={() => { denyConsent(); setConsentSheet(false); }}>Tolak</Btn>
            <Btn variant="filled" onClick={async () => { const ok = await allowConsent(); setConsentSheet(false); if (ok) snack("Siap! Namamu akan diingat"); }}>Izinkan</Btn>
          </div>
        </Sheet>

        <Dialog open={consentDlg} onClose={() => { setConsentDlg(false); pendingRef.current = null; }}
          icon="cookie" title="Butuh izin cookie"
          text="Untuk suka dan komentar, kami perlu cookie kecil supaya satu orang satu suka dan namamu diingat. Boleh?"
          actions={<>
            <Btn variant="text" onClick={() => { setConsentDlg(false); pendingRef.current = null; }}>Nanti saja</Btn>
            <Btn variant="filled" onClick={async () => {
              const ok = await allowConsent(); setConsentDlg(false);
              if (ok) { snack("Cookie diizinkan"); const run = pendingRef.current; pendingRef.current = null; run?.(); }
            }}>Izinkan</Btn>
          </>} />
      </MotionConfig>
    </Ctx.Provider>
  );
}
