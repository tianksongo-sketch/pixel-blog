export default function PostLoading() {
  return (
    <main className="container page article">
      <div className="crumbs">
        <a href="/">Beranda</a>
        <span className="ms" style={{ fontSize: 12 }}>chevron_right</span>
        <span>Tulisan</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 10 }}>
        <div className="skel" style={{ width: "40%", height: 12, borderRadius: 6 }} />
        <div className="skel" style={{ width: "100%", height: 38, borderRadius: 8 }} />
        <div className="skel" style={{ width: "70%", height: 38, borderRadius: 8 }} />
        <div className="skel" style={{ width: "100%", aspectRatio: "16/10", borderRadius: 20, marginTop: 10 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          <div className="skel" style={{ width: "100%", height: 16, borderRadius: 6 }} />
          <div className="skel" style={{ width: "100%", height: 16, borderRadius: 6 }} />
          <div className="skel" style={{ width: "85%", height: 16, borderRadius: 6 }} />
          <div className="skel" style={{ width: "92%", height: 16, borderRadius: 6 }} />
          <div className="skel" style={{ width: "60%", height: 16, borderRadius: 6 }} />
        </div>
      </div>
    </main>
  );
}
