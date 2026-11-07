export const workspaceRoutes = [
  {
    href: "/",
    label: "Overview",
    title: "Patient overview",
    description: "The current patient picture and the next care action.",
  },
  {
    href: "/vitals",
    label: "Vitals",
    title: "Vitals",
    description:
      "Inspect measurements, trends, and original observation times.",
  },
  {
    href: "/care",
    label: "Care response",
    title: "Care response",
    description: "Review assigned episodes and record a human response.",
  },
  {
    href: "/observations",
    label: "Observations",
    title: "Observations",
    description:
      "Record caregiver context and inspect the evidence extracted from it.",
  },
  {
    href: "/simulation",
    label: "Simulation",
    title: "Simulation",
    description: "Generate synthetic readings and repeat the care journey.",
  },
] as const;
