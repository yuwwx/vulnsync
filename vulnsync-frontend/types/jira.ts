// Типы Jira: единый источник, используются сервисом и страницами справочников.
export type JiraProject = {
  id: string;
  key: string;
  name: string;
  projectTypeKey?: string;
};

export type JiraCustomField = {
  id: string;
  name: string;
  schema?: {
    type?: string;
    items?: string;
    custom?: string;
  };
};
