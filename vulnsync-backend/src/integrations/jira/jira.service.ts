// jira.service.ts
import { Injectable } from '@nestjs/common';
import { JiraClient } from './jira.client';

@Injectable()
export class JiraService {
  constructor(private jiraClient: JiraClient) {}

  async createIssue(payload: any) {
    return this.jiraClient.createIssue(payload);
  }

  async getProjects() {
    const data = await this.jiraClient.getProjects();
    return data;
  }

  async getCustomFields() {
    const data = await this.jiraClient.getCustomFields();
    return data;
  }
}
