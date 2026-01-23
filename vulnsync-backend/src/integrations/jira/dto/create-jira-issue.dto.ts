// dto/create-jira-issue.dto.ts
import { IsNumber } from 'class-validator';

export class CreateJiraIssueDto {
  @IsNumber()
  findingId: number;

  @IsNumber()
  ddProductTypeId: number;
}
