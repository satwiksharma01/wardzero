import { getStore } from "./database";

const workerGlobal = globalThis as typeof globalThis & {
  wardzeroDeadlineTimer?: ReturnType<typeof setInterval>;
};
export async function startEscalationWorker() {
  if (workerGlobal.wardzeroDeadlineTimer) return;
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      await (await getStore()).evaluateDeadlines(new Date());
    } catch {
      console.error("escalation_worker_tick_failed");
    } finally {
      busy = false;
    }
  };
  workerGlobal.wardzeroDeadlineTimer = setInterval(() => {
    void tick();
  }, 1000);
  workerGlobal.wardzeroDeadlineTimer.unref();
  await tick();
}
