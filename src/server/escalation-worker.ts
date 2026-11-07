import { getStore } from "./database";
import { configuredEmailProvider } from "./email-provider";

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
      const store = await getStore();
      await store.evaluateDeadlines(new Date());
      try {
        await store.notifications.runDue(new Date(), configuredEmailProvider());
      } catch {
        console.error("notification_worker_tick_failed");
      }
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
