import type { ReactNode } from "react";
import { WorkspaceProvider } from "@/components/workspace-state";
import { CareIdentityProvider } from "@/components/care-identity";
import { WorkspaceShell } from "@/components/workspace-shell";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <CareIdentityProvider>
        <WorkspaceShell>{children}</WorkspaceShell>
      </CareIdentityProvider>
    </WorkspaceProvider>
  );
}
