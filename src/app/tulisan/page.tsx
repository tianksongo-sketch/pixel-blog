import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TulisanRedirect({ searchParams }: { searchParams: Promise<{ label?: string }> }) {
  const sp = await searchParams;
  const label = typeof sp.label === "string" ? `?label=${encodeURIComponent(sp.label.slice(0, 24))}` : "";
  redirect(`/${label}`);
}
