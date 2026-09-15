// vulnerabilities.service.ts
import { DefectDojoService } from '@/integrations/defectdojo/defectdojo.service';
import { JiraDescriptionService } from '@/integrations/jira/jira-description.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import https from 'https';
import axios from 'axios';
import { VulnerabilityListResponseDto } from './dto/vulnerability-list.dto';
import { DEFAULT_AI_SYSTEM_PROMPT } from './ai-prompt';
import { plainToInstance } from 'class-transformer';
import { SettingsService } from '@/settings/settings.service';

@Injectable()
export class VulnerabilitiesService {
  private readonly logger = new Logger(VulnerabilitiesService.name);
  constructor(
    private prisma: PrismaService,
    private defectDojo: DefectDojoService,
    private jiraDescriptionService: JiraDescriptionService,
    private settingsService: SettingsService,
  ) {}

  async getProductTypes() {
    return this.defectDojo.getProductTypes();
  }

  async getVulnerabilities(
    productId: number,
    page = 1,
    limit = 10000,
    title?: string,
  ): Promise<VulnerabilityListResponseDto> {
    const offset = (page - 1) * limit;

    const findingsResponse = await this.defectDojo.getFindingsByProduct(
      productId,
      limit,
      offset,
      title,
    );

    const findings = findingsResponse.results;

    const externalIds = findings.map((f) => f.id.toString());

    const synced = await this.prisma.vulnerabilitySync.findMany({
      where: {
        externalId: { in: externalIds },
        source: 'DEFECTDOJO',
      },
    });

    const syncMap = new Map(synced.map((s) => [s.externalId, s]));

    return plainToInstance(VulnerabilityListResponseDto, {
      data: findings.map((finding) => ({
        id: finding.id,
        title: finding.title,
        severity: finding.severity,
        status: syncMap.get(finding.id.toString())?.status ?? 'Не отправлена',
        cvssv3_score: finding.cvssv3_score,
        cvssv4_score: finding.cvssv4_score,
        creation_date: finding.date,
        product: finding?.related_fields?.test?.engagement?.product?.name,
        jiraIssueKey: syncMap.get(finding.id.toString())?.jiraIssueKey,
      })),

      pagination: {
        total: findingsResponse.count,
        page,
        limit,
        pages: Math.ceil(findingsResponse.count / limit),
      },
    });
  }

  async getJiraDescriptionPreview(findingIds: number[]) {
    const findings = await Promise.all(
      findingIds.map((id) => this.defectDojo.getFinding(id)),
    );
    if (findings.length === 1) {
      return {
        description:
          this.jiraDescriptionService.renderSingleFindingJiraDescription(
            findings[0],
          ),
      };
    }
    return {
      description:
        this.jiraDescriptionService.renderBulkFindingsJiraDescription(findings),
    };
  }

  async askAi(findingIds: number[], messages: AiMessage[] = []) {
    const requestId = Math.random().toString(36).slice(2, 10);
    this.logger.log(
      `[AI:${requestId}] request started: findings=${findingIds.length}, messages=${messages.length}`,
    );
    const setting = await this.settingsService.getByType('ML');
    const apiUrl = setting.baseUrl;
    const token = await this.settingsService.getSecretByType('ML');
    const configuredModel = (setting as unknown as { model?: string | null })
      .model;
    const model = configuredModel?.trim() || 'giga_GigaChat-2-Max';

    if (!apiUrl || !token) {
      this.logger.error(
        `[AI:${requestId}] configuration is incomplete: URL or token is missing`,
      );
      throw new ServiceUnavailableException(
        'AI не настроен: укажите URL ML и токен в настройках интеграций',
      );
    }

    this.logger.log(`[AI:${requestId}] loading findings from DefectDojo`);
    let findings;
    try {
      findings = await Promise.all(
        findingIds.map((id) => this.defectDojo.getFinding(id)),
      );
    } catch (error) {
      this.logger.error(
        `[AI:${requestId}] failed to load findings`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadGatewayException(
        'Не удалось получить данные уязвимости из DefectDojo',
      );
    }
    this.logger.log(`[AI:${requestId}] findings loaded: ${findings.length}`);
    const vulnerabilityDescription = findings
      .map((finding) =>
        this.jiraDescriptionService.renderSingleFindingJiraDescription(finding),
      )
      .join('\n\n---\n\n');

    const systemPrompt = setting.systemPrompt || DEFAULT_AI_SYSTEM_PROMPT;

    const requestMessages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: vulnerabilityDescription },
      ...messages,
    ];

    this.logger.log(
      `[AI:${requestId}] sending request: model=${model}, url=${apiUrl}`,
    );
    let response;
    try {
      response = await axios.post<AiCompletionResponse>(
        apiUrl,
        { model, messages: requestMessages },
        {
          headers: {
            Authorization: `${token}`,
            'Content-Type': 'application/json',
          },
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        },
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `[AI:${requestId}] ML request failed: status=${error.response?.status ?? 'network'}, message=${error.message}`,
        );
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new ServiceUnavailableException(
            'AI отклонил запрос: проверьте токен ML',
          );
        }
        throw new BadGatewayException('Не удалось получить ответ от ML');
      }
      this.logger.error(
        `[AI:${requestId}] unexpected ML request failure`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadGatewayException('Ошибка при обращении к ML');
    }
    this.logger.log(
      `[AI:${requestId}] response received: status=${response.status}`,
    );

    const content = response.data.choices?.[0]?.message?.content;
    if (!content) {
      this.logger.error(`[AI:${requestId}] ML returned an empty response`);
      throw new BadGatewayException('ML вернул пустой ответ');
    }

    this.logger.log(`[AI:${requestId}] request completed successfully`);
    return { message: { role: 'assistant' as const, content } };
  }
}

export type AiMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type AiCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};
