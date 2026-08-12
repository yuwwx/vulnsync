// constants/integrations.ts
export const INTEGRATIONS = [
  { type: "ML", label: "AI / ML" },
  { type: "DEFECTDOJO", label: "DefectDojo" },
  { type: "JIRA", label: "Jira" },
  { type: "DEPENDENCY_TRACK", label: "Dependency-Track" },
] as const;

export type IntegrationType = (typeof INTEGRATIONS)[number]["type"];
