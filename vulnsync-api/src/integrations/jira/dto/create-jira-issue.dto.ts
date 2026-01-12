// dto/create-jira-issue.dto.ts
import { IsNumber, IsString } from 'class-validator';

export class CreateJiraIssueDto {
  @IsNumber()
  findingId: number;

  @IsString()
  productId: string;
}
