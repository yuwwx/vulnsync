// jira.service.ts
import { Injectable } from '@nestjs/common';
import { JiraClient } from './jira.client';

@Injectable()
export class JiraService {
  constructor(private jiraClient: JiraClient) {}

  async createIssue(payload: any) {
    return this.jiraClient.createIssue(payload);
  }
}
