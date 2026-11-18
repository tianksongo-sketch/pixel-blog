import { TopAppBar } from "@/components/TopAppBar";
import { Skel } from "@/components/ui";

export default function Loading() {
  return (
    <>
      <TopAppBar title="Postingan" back />
      <main className="container page article" aria-busy="true">
        <Skel h={14} w="45%" />
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Skel h={32} w={72} r={999} /><Skel h={32} w={110} r={999} />
        </div>
        <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
          <Skel h={34} w="96%" r={10} /><Skel h={34} w="88%" r={10} /><Skel h={34} w="60%" r={10} />
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 20 }}>
          <Skel h={38} w={38} r={999} /><Skel h={14} w={180} />
        </div>
        <div style={{ marginTop: 22 }}><Skel h={0} r={28} className="skel-hero" /></div>
        <div style={{ marginTop: 24, display: "grid", gap: 12 }}>
          <Skel h={14} /><Skel h={14} w="98%" /><Skel h={14} w="92%" /><Skel h={14} w="95%" /><Skel h={14} w="70%" />
        </div>
      </main>
    </>
  );
}
