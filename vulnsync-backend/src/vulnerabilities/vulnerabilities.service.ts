// vulnerabilities.service.ts
import { DefectDojoService } from '@/integrations/defectdojo/defectdojo.service';
import { JiraDescriptionService } from '@/integrations/jira/jira-description.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { VulnerabilityListResponseDto } from './dto/vulnerability-list.dto';
import { plainToInstance } from 'class-transformer';
import { SettingsService } from '@/settings/settings.service';

@Injectable()
export class VulnerabilitiesService {
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
    const setting = await this.settingsService.getByType('ML');
    const apiUrl = setting.baseUrl;
    const token = await this.settingsService.getSecretByType('ML');
    const model = 'giga_GigaChat-2-Max';

    if (!apiUrl || !token) {
      throw new Error('ML_API_URL и ML_API_TOKEN не настроены');
    }

    const findings = await Promise.all(
      findingIds.map((id) => this.defectDojo.getFinding(id)),
    );
    const vulnerabilityDescription = findings
      .map((finding) => this.jiraDescriptionService.renderSingleFindingJiraDescription(finding))
      .join('\n\n---\n\n');

    const systemPrompt = setting.systemPrompt || `Ты — опытный Application Security Engineer.

Проанализируй уязвимость и оцени, насколько она применима к моему проекту.

Ответь в следующем формате:

1. Кратко:
Что это за уязвимость и какой компонент затрагивает.

2. Затрагиваемый тип проекта:
Frontend / Backend / Оба.
Объясни почему.

3. Условия эксплуатации:
- какие версии зависимости уязвимы;
- требуется ли использование конкретного функционала;
- может ли быть использована в production;
- влияет ли только на dev-зависимости;
- распространяется ли риск через транзитивные зависимости.

4. Что проверить в проекте:
Укажи конкретно:
- файлы (package.json, package-lock.json, yarn.lock и т.д.);
- настройки;
- использование уязвимого функционала в коде.

5. Оценка применимости:
Выбери один вариант:
- ✅ Не применима
- ⚠️ Требует проверки
- 🔴 Применима

Объясни причину.

6. Дополнительная информация:
Если недостаточно данных — укажи, что именно нужно предоставить для окончательной оценки.

Не пересказывай полное описание уязвимости. Основная цель — определить реальный риск для проекта и необходимые проверки.`;

    const requestMessages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: vulnerabilityDescription },
      ...messages,
    ];

    const response = await axios.post<AiCompletionResponse>(
      `${apiUrl.replace(/\/$/, '')}/api/v1/chat/completions`,
      { model, messages: requestMessages },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
    );

    const content = response.data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('ML вернул пустой ответ');
    }

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
