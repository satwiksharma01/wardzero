import { ArchiveView } from "@/components/archive-view";
import { notFound } from "next/navigation";
import { getStore } from "@/server/database";
import { runIdentity } from "@/domain/demo";
import { isCareError } from "@/domain/care";
export const dynamic = "force-dynamic";
export default async function Archive({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!runIdentity.safeParse(id).success) notFound();
  const store = await getStore();
  const runs = await store.demo.list();
  // A direct archive link can outlive the bounded recent-run index.
  let snapshot;
  try {
    snapshot = await store.snapshot(new Date(), id);
  } catch (error) {
    if (isCareError(error) && error.status === 404) notFound();
    throw error;
  }
  return <ArchiveView snapshot={snapshot} runCount={runs.length} />;
}
