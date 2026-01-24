// types/jira.ts
export type JiraCustomField = {
  id: string;
  name: string;
  schema?: {
    type?: string;
    custom?: string;
  };
};

// types/jira.ts
export type JiraProject = {
  id: string;
  key: string;
  name: string;
  projectTypeKey?: string;
};
