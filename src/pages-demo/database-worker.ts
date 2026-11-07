import { PGlite } from "@electric-sql/pglite";
import { worker } from "@electric-sql/pglite/worker";
import { migrate } from "../server/migrations";

void worker({
  async init() {
    const db = await PGlite.create("idb://wardzero-pages-v1");
    await migrate(db);
    return db;
  },
});
