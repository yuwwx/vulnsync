"use client";

import { AiChatDialog } from "@/components/vulnerabilities/AiChatDialog";
import { DescriptionDialog } from "@/components/vulnerabilities/DescriptionDialog";
import { JiraLinkDialog } from "@/components/vulnerabilities/JiraLinkDialog";
import { SeverityDialog } from "@/components/vulnerabilities/SeverityDialog";
import { vulnerabilityColumns } from "@/components/vulnerabilities/vulnerabilities-columns";
import { VulnerabilitiesTable } from "@/components/vulnerabilities/vulnerabilities-table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DefectDojoEngagement,
  DefectDojoProduct,
  DefectDojoProductType,
  DefectDojoReferenceService,
} from "@/services/reference/defectdojo.service";
import { ReportsService } from "@/services/reports.service";
import { Vulnerability, VulnerabilitiesService } from "@/services/vulnerabilities.service";
import { VulnerabilitySyncService } from "@/services/vulnerability-sync.service";
import dayjs from "dayjs";
import { ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const SEVERITY_ORDER = ["Critical", "High", "Medium", "Low", "Info"] as const;

const SEVERITY_STYLES: Record<string, string> = {
  Critical: "bg-red-100 text-red-700",
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-yellow-100 text-yellow-800",
  Low: "bg-blue-100 text-blue-700",
  Info: "bg-neutral-100 text-neutral-600",
};

function SeverityBadges({
  counts,
}: {
  counts: Record<string, number> | null;
}) {
  if (!counts) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {SEVERITY_ORDER.map((severity) => (
        <span
          key={severity}
          className={`rounded px-2 py-0.5 font-medium ${SEVERITY_STYLES[severity]}`}
        >
          {severity}: {counts[severity] ?? 0}
        </span>
      ))}
    </div>
  );
}

export default function VulnerabilitiesPage() {
  const router = useRouter();
  const pathname = usePathname();
  // Флаг: восстановление раздела из URL завершено — до этого не затираем URL
  const restoredRef = useRef(false);

  const [productTypes, setProductTypes] = useState<DefectDojoProductType[]>([]);
  const [selectedProductTypeId, setSelectedProductTypeId] = useState<
    number | null
  >(null);
  // Продукты выбранного типа и выбранный продукт (null = «Все»)
  const [products, setProducts] = useState<DefectDojoProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );
  // Выбран ли пункт «Все» (весь тип) — отдельно от «ничего не выбрано»
  const [isAllProductsSelected, setIsAllProductsSelected] = useState(false);
  // Загруженный скоуп уязвимостей; null = продукт выбран, но тест/весь
  // продукт ещё не выбраны — тяжёлый запрос не выполняется
  const [selectedScope, setSelectedScope] = useState<{
    productTypeId?: number;
    productId?: number;
    testId?: number;
  } | null>(null);
  // Заголовок выбранного теста (для подписи скоупа)
  const [scopeTestTitle, setScopeTestTitle] = useState<string | null>(null);
  // Сканирования выбранного продукта: engagements, внутри каждого — тесты
  const [scans, setScans] = useState<DefectDojoEngagement[]>([]);
  const [scansLoading, setScansLoading] = useState(false);
  const [openEngagements, setOpenEngagements] = useState<string[]>([]);
  // Разбивка открытых уязвимостей продукта по критичности
  const [severityCounts, setSeverityCounts] = useState<Record<
    string,
    number
  > | null>(null);

  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  // Выделение по finding id, вне таблицы: переживает смену страницы,
  // поиск и подгрузку данных (серверная пагинация)
  const [selectedById, setSelectedById] = useState<Map<number, Vulnerability>>(
    new Map(),
  );
  const [loadingVulns, setLoadingVulns] = useState(false);
  const [vulnsSearch, setVulnsSearch] = useState("");
  // Серверная сортировка: "severity" | "-id" ... (null = дефолт DD API: по id)
  const [sort, setSort] = useState<string | null>(null);
  // Фильтр по критичности (пусто = все); серверный, можно несколько
  const [severity, setSeverity] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const [error, setError] = useState<string | null>(null);

  const [activeVuln, setActiveVuln] = useState<Vulnerability | null>(null);

  const [openAiChat, setOpenAiChat] = useState(false);
  const [aiFindingIds, setAiFindingIds] = useState<number[]>([]);

  const [openDescription, setOpenDescription] = useState(false);
  const [descriptionFindingIds, setDescriptionFindingIds] = useState<number[]>(
    [],
  );
  const [isBulkDescription, setIsBulkDescription] = useState(false);

  const [openJiraLink, setOpenJiraLink] = useState(false);
  const [isBulkJiraLink, setIsBulkJiraLink] = useState(false);
  const [linkSaving, setLinkSaving] = useState(false);

  const [openSeverityChange, setOpenSeverityChange] = useState(false);
  const [isBulkSeverityChange, setIsBulkSeverityChange] = useState(false);
  const [severitySaving, setSeveritySaving] = useState(false);

  useEffect(() => {
    DefectDojoReferenceService.getProductTypes()
      .then(setProductTypes)
      .catch(() =>
        setError("Не удалось получить типы продуктов из DefectDojo"),
      );
  }, []);

  // Восстанавливаем раздел из query-параметров при заходе (F5, возврат из
  // карточки уязвимости). Только асинхронные setState — иначе линтер
  // react-hooks/set-state-in-effect ругается.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = Number(params.get("type")) || null;
    const product = Number(params.get("product")) || null;
    const test = Number(params.get("test")) || null;
    const view = params.get("view");
    const page = Number(params.get("page")) || 1;
    const sortParam = params.get("sort");
    const title = params.get("title") ?? "";
    const severityParam = (params.get("severity") ?? "")
      .split(",")
      .filter(Boolean);

    if (!type) {
      restoredRef.current = true;
      return;
    }

    DefectDojoReferenceService.getProducts(type)
      .then(setProducts)
      .catch(() => undefined);

    if (product) {
      DefectDojoReferenceService.getProductScans(product)
        .then((tree) => {
          setScans(tree);
          setOpenEngagements(tree.map((engagement) => String(engagement.id)));
        })
        .catch(() => undefined);
    }

    const scope = test
      ? { testId: test }
      : view === "product" && product
        ? { productId: product }
        : view === "type"
          ? { productTypeId: type }
          : null;

    const apply = () => {
      setSelectedProductTypeId(type);
      setSelectedProductId(product);
      setIsAllProductsSelected(view === "type");
      setSelectedScope(scope);
      restoredRef.current = true;
    };

    if (scope) {
      VulnerabilitiesService.getVulnerabilities(
        scope,
        page,
        10,
        title,
        sortParam,
        severityParam.join(","),
      )
        .then((resp) => {
          setVulns(resp.data);
          setPagination({
            page: resp.pagination.page,
            limit: resp.pagination.limit,
            total: resp.pagination.total,
            pages: resp.pagination.pages,
          });
          setSort(sortParam);
          setVulnsSearch(title);
          setSeverity(severityParam);
          apply();
        })
        .catch(() => apply());
    } else {
      DefectDojoReferenceService.getProductTypeSeverityCounts(type)
        .then(setSeverityCounts)
        .catch(() => undefined);
      void Promise.resolve().then(apply);
    }
  }, []);

  // Отражаем раздел в URL, чтобы возврат из карточки и F5 восстанавливали его
  useEffect(() => {
    if (!restoredRef.current) {
      return;
    }

    const params = new URLSearchParams();

    if (selectedProductTypeId) {
      params.set("type", String(selectedProductTypeId));
    }
    if (selectedProductId) {
      params.set("product", String(selectedProductId));
    }
    if (selectedScope?.testId) {
      params.set("test", String(selectedScope.testId));
    }

    const view = selectedScope
      ? selectedScope.testId
        ? "test"
        : selectedScope.productId
          ? "product"
          : "type"
      : selectedProductId
        ? "scans"
        : null;
    if (view) {
      params.set("view", view);
    }
    if (pagination.page > 1) {
      params.set("page", String(pagination.page));
    }
    if (sort) {
      params.set("sort", sort);
    }
    if (vulnsSearch) {
      params.set("title", vulnsSearch);
    }
    if (severity.length) {
      params.set("severity", severity.join(","));
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [
    selectedProductTypeId,
    selectedProductId,
    selectedScope,
    pagination.page,
    sort,
    vulnsSearch,
    severity,
    router,
    pathname,
  ]);

  // Серверная пагинация, поиск и сортировка: грузим одну страницу за раз.
  // Выделения живут в selectedById и от запросов не зависят.
  const loadVulnerabilities = useCallback(
    (
      scope: { productTypeId?: number; productId?: number; testId?: number },
      page = 1,
      search = "",
      sort: string | null = null,
      severityFilter = "",
    ) => {
      setLoadingVulns(true);
      setError(null);

      VulnerabilitiesService.getVulnerabilities(
        scope,
        page,
        pagination.limit,
        search,
        sort,
        severityFilter,
      )
        .then((resp) => {
          setVulns(resp.data);
          setPagination({
            page: resp.pagination.page,
            limit: resp.pagination.limit,
            total: resp.pagination.total,
            pages: resp.pagination.pages,
          });
        })
        .catch(() => {
          setError("Не удалось получить уязвимости");
        })
        .finally(() => setLoadingVulns(false));
    },
    [pagination.limit],
  );

  const loadProducts = (productTypeId: number) => {
    setProductsLoading(true);

    DefectDojoReferenceService.getProducts(productTypeId)
      .then(setProducts)
      .catch(() => toast.error("Не удалось получить продукты"))
      .finally(() => setProductsLoading(false));
  };

  const loadScans = (productId: number) => {
    setScansLoading(true);
    setScans([]);
    setOpenEngagements([]);
    setSeverityCounts(null);

    DefectDojoReferenceService.getProductScans(productId)
      .then((tree) => {
        setScans(tree);
        // Сканирования раскрыты по умолчанию
        setOpenEngagements(tree.map((engagement) => String(engagement.id)));
      })
      .catch(() => toast.error("Не удалось получить сканирования"))
      .finally(() => setScansLoading(false));

    // Разбивка по критичности — один запрос к v3 (include=counts)
    DefectDojoReferenceService.getProductSeverityCounts(productId)
      .then(setSeverityCounts)
      .catch(() => setSeverityCounts(null));
  };

  // Разбивка по критичности для группы продуктов (один запрос к v3)
  const loadTypeSeverityCounts = (typeId: number) => {
    setSeverityCounts(null);
    DefectDojoReferenceService.getProductTypeSeverityCounts(typeId)
      .then(setSeverityCounts)
      .catch(() => setSeverityCounts(null));
  };

  // Выбор типа продуктов: список уязвимостей НЕ грузим автоматически —
  // запрос по всему типу тяжёлый, ждём выбора «Все» или конкретного продукта
  const handleSelectType = (type: DefectDojoProductType) => {
    setSelectedProductTypeId(type.id);
    setSelectedProductId(null);
    setIsAllProductsSelected(false);
    setSelectedById(new Map());
    setSelectedScope(null);
    setScopeTestTitle(null);
    setScans([]);
    setOpenEngagements([]);
    setVulnsSearch("");
    setSeverity([]);
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadProducts(type.id);
    loadTypeSeverityCounts(type.id);
  };

  const handleSelectAllProducts = (type: DefectDojoProductType) => {
    setSelectedProductId(null);
    setIsAllProductsSelected(true);
    setSelectedById(new Map());
    setVulnsSearch("");
    setSeverity([]);
    const scope = { productTypeId: type.id };
    setSelectedScope(scope);
    loadVulnerabilities(scope);
  };

  // Выбор продукта: грузим не уязвимости, а дерево сканирований
  const handleSelectProduct = (product: DefectDojoProduct) => {
    setSelectedProductId(product.id);
    setIsAllProductsSelected(false);
    setSelectedById(new Map());
    setVulnsSearch("");
    setSeverity([]);
    setSelectedScope(null);
    setScopeTestTitle(null);
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadScans(product.id);
  };

  // Уязвимости всего продукта
  const handleSelectWholeProduct = () => {
    if (!selectedProductId) return;
    setSelectedById(new Map());
    setVulnsSearch("");
    setSeverity([]);
    const scope = { productId: selectedProductId };
    setSelectedScope(scope);
    loadVulnerabilities(scope);
  };

  // Уязвимости конкретного теста
  const handleSelectTest = (testId: number, title: string) => {
    setSelectedById(new Map());
    setVulnsSearch("");
    setSeverity([]);
    const scope = { testId };
    setSelectedScope(scope);
    setScopeTestTitle(title);
    loadVulnerabilities(scope);
  };

  // Назад к списку сканирований продукта
  const handleBackToScans = () => {
    setSelectedScope(null);
    setScopeTestTitle(null);
  };

  // Полный отчёт по активным уязвимостям: продукт или весь тип.
  // Уходит в очередь, письмо придёт примерно через 5 минут.
  const handleRunFullReport = async () => {
    if (!selectedProductTypeId) return;

    const scope =
      !isAllProductsSelected && selectedProductId
        ? { productId: selectedProductId }
        : { productTypeId: selectedProductTypeId };

    try {
      const { runAt } = await ReportsService.runFullFindingsReport(scope);
      toast.success(
        `Отчёт поставлен в очередь, придёт письмом до ${dayjs(runAt).format("HH:mm")}`,
      );
    } catch {
      toast.error("Не удалось поставить отчёт в очередь");
    }
  };

  // --- Выделение (вне таблицы, переживает пагинацию и поиск) ---

  // Массив выбранных из карты id → уязвимость
  const selectedVulns = useMemo(
    () => Array.from(selectedById.values()),
    [selectedById],
  );

  const selectedIds = useMemo(
    () => new Set(selectedById.keys()),
    [selectedById],
  );

  const handleSelectionChange = useCallback(
    (changed: Vulnerability[]) => {
      // Приходят только реально переключенные строки (см. vulnerabilities-table):
      // toggle их состояния в общей карте, остальное не трогаем
      setSelectedById((prev) => {
        const next = new Map(prev);

        for (const vuln of changed) {
          if (next.has(vuln.id)) {
            next.delete(vuln.id);
          } else {
            next.set(vuln.id, vuln);
          }
        }

        return next;
      });
    },
    [],
  );

  // Смена страницы: перезагрузка с сервера, выделения остаются
  const handlePageChange = useCallback(
    (page: number) => {
      if (!selectedScope) return;

      setPagination((prev) => ({ ...prev, page }));
      loadVulnerabilities(selectedScope, page, vulnsSearch, sort, severity.join(","));
    },
    [selectedScope, loadVulnerabilities, vulnsSearch, sort, severity],
  );

  // Поиск по названию: серверный icontains; сбрасываем на первую страницу.
  // Выделения не трогаем — выбранное ранее остаётся.
  const handleSearch = useCallback(
    (search: string) => {
      if (!selectedScope) return;

      setVulnsSearch(search);
      setPagination((prev) => ({ ...prev, page: 1 }));
      loadVulnerabilities(selectedScope, 1, search, sort, severity.join(","));
    },
    [selectedScope, loadVulnerabilities, sort, severity],
  );

  // Фильтр по критичности (серверный, мультивыбор)
  const handleSeverityToggle = useCallback(
    (value: string) => {
      const next = severity.includes(value)
        ? severity.filter((item) => item !== value)
        : [...severity, value];
      setSeverity(next);

      if (selectedScope) {
        setPagination((prev) => ({ ...prev, page: 1 }));
        loadVulnerabilities(selectedScope, 1, vulnsSearch, sort, next.join(","));
      }
    },
    [severity, selectedScope, loadVulnerabilities, vulnsSearch, sort],
  );

  const handleSeverityClear = useCallback(() => {
    setSeverity([]);

    if (selectedScope) {
      setPagination((prev) => ({ ...prev, page: 1 }));
      loadVulnerabilities(selectedScope, 1, vulnsSearch, sort, "");
    }
  }, [selectedScope, loadVulnerabilities, vulnsSearch, sort]);

  // Серверная сортировка: клик по заголовку — null → asc → desc → null.
  // Выделения не трогаем.
  const handleSortToggle = useCallback(
    (columnId: string) => {
      const next =
        sort?.replace('-', '') !== columnId
          ? columnId
          : sort!.startsWith('-')
            ? null
            : `-${columnId}`;

      setSort(next);

      if (selectedScope) {
        setPagination((prev) => ({ ...prev, page: 1 }));
        loadVulnerabilities(selectedScope, 1, vulnsSearch, next, severity.join(","));
      }
    },
    [sort, selectedScope, loadVulnerabilities, vulnsSearch, severity],
  );

  // --- Спросить у AI ---

  const handleAskAi = (vuln: Vulnerability) => {
    setAiFindingIds([vuln.id]);
    setOpenAiChat(true);
  };

  const handleBulkAskAi = () => {
    setAiFindingIds(selectedVulns.map((vuln) => vuln.id));
    setOpenAiChat(true);
  };

  // --- Описание для Jira ---

  const handleGenerateDescription = (vuln: Vulnerability) => {
    setIsBulkDescription(false);
    setDescriptionFindingIds([vuln.id]);
    setOpenDescription(true);
  };

  const handleBulkGenerateDescription = () => {
    setIsBulkDescription(true);
    setDescriptionFindingIds(selectedVulns.map((v) => v.id));
    setOpenDescription(true);
  };

  // --- Отправка в Jira (создание новой задачи) ---

  const handleSendToJira = useCallback(
    async (vuln: Vulnerability) => {
      if (!selectedProductTypeId) return;

      try {
        const response = await VulnerabilitySyncService.createJiraIssue({
          findingId: vuln.id,
          ddProductTypeId: selectedProductTypeId,
        });

        setVulns((prev) =>
          prev.map((v) =>
            v.id === vuln.id
              ? {
                  ...v,
                  status: "Назначена",
                  jiraIssueKey: response?.jiraIssueKey,
                }
              : v,
          ),
        );

        toast.success("Jira issue создан");
      } catch {
        toast.error(`Не удалось создать Jira issue`);
      }
    },
    [selectedProductTypeId],
  );

  const handleBulkSendToJira = useCallback(async () => {
    if (!selectedProductTypeId || selectedVulns.length === 0) return;

    try {
      // Создаём один Jira issue на все выбранные уязвимости
      const response = await VulnerabilitySyncService.createBulkJiraIssue({
        findingIds: selectedVulns.map((v) => v.id),
        ddProductTypeId: selectedProductTypeId,
      });

      const jiraIssueKey = response?.jiraIssueKey;

      if (!jiraIssueKey) {
        toast.error("Jira issue не создан");
        return;
      }

      const vulnIds = new Set(selectedVulns.map((v) => v.id));

      setVulns((prev) =>
        prev.map((v) =>
          vulnIds.has(v.id) ? { ...v, status: "Назначена", jiraIssueKey } : v,
        ),
      );

      toast.success("Jira issue создан");
    } catch {
      toast.error("Не удалось создать Jira issue");
    }
  }, [selectedProductTypeId, selectedVulns]);

  // --- Связь с Jira (привязка к существующей задаче) ---

  const handleLinkWithJira = (vuln: Vulnerability) => {
    setActiveVuln(vuln);
    setIsBulkJiraLink(false);
    setOpenJiraLink(true);
  };

  const handleBulkLinkWithJira = () => {
    setActiveVuln(null);
    setIsBulkJiraLink(true);
    setOpenJiraLink(true);
  };

  const handleSaveJiraLink = async (jiraKey: string) => {
    if (isBulkJiraLink) {
      if (selectedVulns.length === 0 || !jiraKey) return;

      setLinkSaving(true);
      try {
        const response = await VulnerabilitySyncService.executeCommand({
          action: "link",
          findingIds: selectedVulns.map((vuln) => vuln.id),
          jiraIssueKey: jiraKey,
        });
        const successfulIds = new Set(
          response.results
            .filter((result) => result.status === "success")
            .map((result) => result.findingId),
        );

        setVulns((prev) =>
          prev.map((v) =>
            successfulIds.has(v.id)
              ? { ...v, status: "Назначена", jiraIssueKey: jiraKey }
              : v,
          ),
        );
        toast.success(
          `Связано с Jira: ${response.succeeded} из ${response.total}`,
        );
        setOpenJiraLink(false);
      } finally {
        setLinkSaving(false);
      }
      return;
    }

    if (!activeVuln) return;

    setLinkSaving(true);
    try {
      const command = await VulnerabilitySyncService.executeCommand({
        action: "link",
        findingIds: [activeVuln.id],
        jiraIssueKey: jiraKey,
      });
      const response = command.results[0];

      if (response?.status !== "success") {
        throw new Error(response?.error || "Не удалось связать с Jira");
      }

      setVulns((prev) =>
        prev.map((v) =>
          v.id === activeVuln.id
            ? {
                ...v,
                status: response.syncedStatus ?? v.status,
                jiraIssueKey: response.jiraIssueKey ?? v.jiraIssueKey,
              }
            : v,
        ),
      );

      toast.success("Связано с Jira");
      setOpenJiraLink(false);
    } catch {
      toast.error("Не удалось связать с Jira");
    } finally {
      setLinkSaving(false);
    }
  };

  // --- Синхронизация статуса с Jira ---

  const handleSyncWithJira = async (vuln: Vulnerability) => {
    try {
      const command = await VulnerabilitySyncService.executeCommand({
        action: "sync",
        findingIds: [vuln.id],
      });
      const response = command.results[0];

      if (response?.status !== "success") {
        toast.error(response?.error || "Не удалось синхронизировать статус");
        return;
      }

      setVulns((prev) =>
        prev.map((v) =>
          v.id === vuln.id
            ? {
                ...v,
                status: response.syncedStatus ?? v.status,
                jiraIssueKey: response.jiraIssueKey ?? v.jiraIssueKey,
              }
            : v,
        ),
      );

      toast.success("Статус синхронизирован");
    } catch {
      toast.error("Не удалось синхронизировать статус");
    }
  };

  const handleUnsyncWithJira = async (vuln: Vulnerability) => {
    try {
      const response = await VulnerabilitySyncService.executeCommand({
        action: "unsync",
        findingIds: [vuln.id],
      });

      if (response.results[0]?.status !== "success") {
        throw new Error(
          response.results[0]?.error || "Не удалось отвязать от Jira",
        );
      }

      setVulns((prev) =>
        prev.map((v) =>
          v.id === vuln.id
            ? { ...v, status: "Не отправлена", jiraIssueKey: "" }
            : v,
        ),
      );

      toast.success("Успешно отвязана");
    } catch {
      toast.error("Не удалось отвязать от Jira");
    }
  };

  const handleBulkSyncWithJira = async () => {
    const response = await VulnerabilitySyncService.executeCommand({
      action: "sync",
      findingIds: selectedVulns.map((vuln) => vuln.id),
    });
    const resultsById = new Map(
      response.results.map((result) => [result.findingId, result]),
    );
    setVulns((prev) =>
      prev.map((v) => {
        const result = resultsById.get(v.id);
        return result?.status === "success"
          ? {
              ...v,
              status: result.syncedStatus ?? v.status,
              jiraIssueKey: result.jiraIssueKey ?? v.jiraIssueKey,
            }
          : v;
      }),
    );
    toast.success(
      `Статус синхронизирован: ${response.succeeded} из ${response.total}`,
    );
  };

  const handleBulkUnsyncWithJira = async () => {
    const response = await VulnerabilitySyncService.executeCommand({
      action: "unsync",
      findingIds: selectedVulns.map((vuln) => vuln.id),
    });
    const successfulIds = new Set(
      response.results
        .filter((result) => result.status === "success")
        .map((result) => result.findingId),
    );
    setVulns((prev) =>
      prev.map((v) =>
        successfulIds.has(v.id)
          ? { ...v, status: "Не отправлена", jiraIssueKey: "" }
          : v,
      ),
    );
    toast.success(
      `Отвязано от Jira: ${response.succeeded} из ${response.total}`,
    );
  };

  // --- Критичность ---

  const handleChangeSeverity = (vuln: Vulnerability) => {
    setActiveVuln(vuln);
    setIsBulkSeverityChange(false);
    setOpenSeverityChange(true);
  };

  const handleBulkChangeSeverity = () => {
    setActiveVuln(null);
    setIsBulkSeverityChange(true);
    setOpenSeverityChange(true);
  };

  const handleSaveSeverity = async (severity: string) => {
    if (isBulkSeverityChange) {
      if (selectedVulns.length === 0 || !severity) return;

      setSeveritySaving(true);
      try {
        const response = await VulnerabilitySyncService.executeCommand({
          action: "severity",
          findingIds: selectedVulns.map((vuln) => vuln.id),
          severity,
        });
        const successfulIds = new Set(
          response.results
            .filter((result) => result.status === "success")
            .map((result) => result.findingId),
        );
        setVulns((prev) =>
          prev.map((v) =>
            successfulIds.has(v.id) ? { ...v, severity } : v,
          ),
        );
        toast.success(
          `Критичность изменена: ${response.succeeded} из ${response.total}`,
        );
        setOpenSeverityChange(false);
      } finally {
        setSeveritySaving(false);
      }
      return;
    }

    if (!activeVuln || !severity) return;

    setSeveritySaving(true);
    try {
      const response = await VulnerabilitySyncService.executeCommand({
        action: "severity",
        findingIds: [activeVuln.id],
        severity,
      });
      const result = response.results[0];

      if (result?.status !== "success") {
        throw new Error(result?.error || "Не удалось изменить критичность");
      }

      setVulns((prev) =>
        prev.map((v) =>
          v.id === activeVuln.id
            ? { ...v, severity: result.severity ?? v.severity }
            : v,
        ),
      );
      toast.success("Критичность изменена, finding отмечен как Verified");
      setOpenSeverityChange(false);
    } catch {
      toast.error("Не удалось изменить критичность");
    } finally {
      setSeveritySaving(false);
    }
  };

  const columns = useMemo(
    () =>
      vulnerabilityColumns({
        actions: {
          onSendToJira: handleSendToJira,
          onLinkWithJira: handleLinkWithJira,
          onSyncWithJira: handleSyncWithJira,
          onUnsyncWithJira: handleUnsyncWithJira,
          onChangeSeverity: handleChangeSeverity,
          onGenerateDescription: handleGenerateDescription,
          onAskAi: handleAskAi,
        },
        onSelectToggle: handleSelectionChange,
        selectedIds,
        sort,
        onSortToggle: handleSortToggle,
      }),
    [
      handleSendToJira,
      handleLinkWithJira,
      handleSyncWithJira,
      handleUnsyncWithJira,
      handleChangeSeverity,
      handleGenerateDescription,
      handleAskAi,
      handleSelectionChange,
      selectedIds,
      sort,
      handleSortToggle,
    ],
  );

  const selectedType = useMemo(
    () => productTypes.find((type) => type.id === selectedProductTypeId) ?? null,
    [productTypes, selectedProductTypeId],
  );

  // Сводка по продуктам типа: суммарное число findings для пункта «Все»
  const totalFindingsCount = useMemo(
    () =>
      products.reduce((sum, product) => sum + (product.findingsCount ?? 0), 0),
    [products],
  );

  // Выбранный продукт (для числа открытых уязвимостей из ответа /products)
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  // Подпись текущего скоупа для «хлебных крошек» над таблицей.
  // Выводим из состояния, а не храним: тогда корректна и после восстановления
  // раздела из URL.
  const scopeLabel = useMemo(() => {
    if (!selectedScope) {
      return null;
    }
    if (selectedScope.testId) {
      return scopeTestTitle
        ? `Тест: ${scopeTestTitle}`
        : "Уязвимости теста";
    }
    if (selectedScope.productId) {
      return selectedProduct
        ? `Все уязвимости продукта: ${selectedProduct.name}`
        : "Все уязвимости продукта";
    }
    if (selectedScope.productTypeId) {
      return selectedType
        ? `Все уязвимости группы продуктов: ${selectedType.name}`
        : "Все уязвимости группы продуктов";
    }
    return null;
  }, [selectedScope, scopeTestTitle, selectedProduct, selectedType]);

  return (
    <>
      <div className="flex gap-6">
        <ul className="min-w-48 border rounded-md p-2 space-y-2 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
          {productTypes.map((type) => (
            <li key={type.id}>
              <div
                onClick={() => handleSelectType(type)}
                className={`p-2 rounded cursor-pointer text-sm font-medium ${
                  selectedProductTypeId === type.id
                    ? "bg-neutral-600 text-white"
                    : "hover:bg-muted"
                }`}
              >
                {type.name}
              </div>
              {selectedProductTypeId === type.id && (
                <ul className="ml-3 mt-1 space-y-1 text-sm">
                  <li
                    onClick={() => handleSelectAllProducts(type)}
                    className={`p-2 rounded cursor-pointer ${
                      isAllProductsSelected
                        ? "bg-neutral-200 font-medium"
                        : "hover:bg-muted"
                    }`}
                  >
                    Все
                  </li>
                  {productsLoading ? (
                    <li className="p-2 text-muted-foreground">
                      Загрузка продуктов…
                    </li>
                  ) : (
                    products.map((product) => (
                      <li
                        key={product.id}
                        onClick={() => handleSelectProduct(product)}
                        className={`p-2 rounded cursor-pointer ${
                          selectedProductId === product.id
                            ? "bg-neutral-200 font-medium"
                            : "hover:bg-muted"
                        }`}
                      >
                        {product.name}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </li>
          ))}
        </ul>

        <div className="flex-1 min-w-0">
          {error ? (
            <div className="p-4 text-red-700 bg-red-100 rounded-md">
              {error}
            </div>
          ) : !selectedProductTypeId ? (
            <div className="text-neutral-500">Выберите тип продуктов</div>
          ) : !selectedScope ? (
            selectedProductId ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium">Сканирования</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleRunFullReport()}
                  >
                    Отчёт по продукту (на почту)
                  </Button>
                </div>
                <SeverityBadges counts={severityCounts} />
                {scansLoading ? (
                  <div className="text-neutral-500">
                    Загрузка сканирований…
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleSelectWholeProduct}
                      className="flex w-full items-center justify-between rounded-md border border-dashed bg-muted/40 px-3 py-4 text-left text-sm font-semibold hover:bg-muted"
                    >
                      <span>
                        Все уязвимости продукта
                        {selectedProduct ? `: ${selectedProduct.name}` : ""}
                      </span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {selectedProduct?.findingsCount ?? 0}
                      </span>
                    </button>
                    {scans.length === 0 ? (
                      <div className="text-neutral-500">
                        У продукта нет сканирований
                      </div>
                    ) : (
                      <Accordion
                        type="multiple"
                        value={openEngagements}
                        onValueChange={setOpenEngagements}
                      >
                        {scans.map((engagement) => (
                          <AccordionItem
                            key={engagement.id}
                            value={String(engagement.id)}
                          >
                            <AccordionTrigger>
                              <span className="flex flex-col gap-0.5">
                                <span>
                                  {engagement.name ??
                                    `Сканирование #${engagement.id}`}
                                </span>
                                <span className="text-xs font-normal text-muted-foreground">
                                  {[
                                    engagement.engagementType,
                                    engagement.version &&
                                      `версия ${engagement.version}`,
                                    engagement.buildId &&
                                      `build ${engagement.buildId}`,
                                    engagement.branchTag &&
                                      `branch ${engagement.branchTag}`,
                                    engagement.commitHash &&
                                      `commit ${engagement.commitHash}`,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              </span>
                            </AccordionTrigger>
                            <AccordionContent>
                              {engagement.tests.length === 0 ? (
                                <div className="text-neutral-500">
                                  Нет тестов
                                </div>
                              ) : (
                                <ul className="space-y-1">
                                  {engagement.tests.map((test) => (
                                    <li key={test.id}>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSelectTest(
                                            test.id,
                                            test.title ?? `Тест #${test.id}`,
                                          )
                                        }
                                        className="w-full rounded p-2 text-left text-sm hover:bg-muted"
                                      >
                                        <span className="font-medium">
                                          {test.title ?? `Тест #${test.id}`}
                                        </span>
                                        <span className="ml-2 text-xs text-muted-foreground">
                                          {[
                                            test.testTypeName,
                                            test.buildId &&
                                              `build ${test.buildId}`,
                                            test.branchTag &&
                                              `branch ${test.branchTag}`,
                                            test.commitHash &&
                                              `commit ${test.commitHash}`,
                                          ]
                                            .filter(Boolean)
                                            .join(" · ")}
                                        </span>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-lg font-medium">
                  Группа продуктов{selectedType ? `: ${selectedType.name}` : ""}
                </h2>
                <SeverityBadges counts={severityCounts} />
              {productsLoading ? (
                <div className="text-neutral-500">Загрузка продуктов…</div>
              ) : products.length === 0 ? (
                <div className="text-neutral-500">
                  В этом типе продуктов нет продуктов
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Продукт</TableHead>
                      <TableHead className="text-right">
                        Открытых уязвимостей
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() =>
                        selectedType && handleSelectAllProducts(selectedType)
                      }
                    >
                      <TableCell className="font-medium">Все</TableCell>
                      <TableCell className="text-right">
                        {totalFindingsCount}
                      </TableCell>
                    </TableRow>
                    {products.map((product) => (
                      <TableRow
                        key={product.id}
                        className="cursor-pointer"
                        onClick={() => handleSelectProduct(product)}
                      >
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.findingsCount ?? 0}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              </div>
            )
          ) : (
            <div>
              {scopeLabel && (
                <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                  {selectedProductId && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={handleBackToScans}
                    >
                      ← Сканирования
                    </Button>
                  )}
                  <span>{scopeLabel}</span>
                </div>
              )}
              {/* Таблица не размонтируется на время загрузки (иначе ремонтинг
                  поискового инпута зацикливал запросы), только затемняется */}
              <div
                className={
                  loadingVulns ? "opacity-50 pointer-events-none" : ""
                }
              >
                <VulnerabilitiesTable
                data={vulns}
                columns={columns}
                onSelectionChange={handleSelectionChange}
                selectedCount={selectedById.size}
                page={pagination.page}
                limit={pagination.limit}
                total={pagination.total}
                onPageChange={handlePageChange}
                onSearch={handleSearch}
                initialSearch={vulnsSearch}
                toolbar={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        Критичность
                        {severity.length > 0 && `: ${severity.length}`}
                        <ChevronDown />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {SEVERITY_ORDER.map((item) => (
                        <DropdownMenuCheckboxItem
                          key={item}
                          checked={severity.includes(item)}
                          onSelect={(event) => event.preventDefault()}
                          onCheckedChange={() => handleSeverityToggle(item)}
                        >
                          {item}
                        </DropdownMenuCheckboxItem>
                      ))}
                      {severity.length > 0 && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={handleSeverityClear}>
                            Сбросить
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
                sort={sort}
                onSortToggle={handleSortToggle}
                fullReportAction={{
                  label: selectedProductId
                    ? "Отчёт по продукту (на почту)"
                    : "Отчёт по группе продуктов (на почту)",
                  disabled: !selectedProductTypeId,
                  onClick: () => void handleRunFullReport(),
                }}
                bulkActions={[
                  {
                    label: `Сгенерировать описание (${selectedVulns.length})`,
                    disabled: selectedVulns.length === 0,
                    onClick: handleBulkGenerateDescription,
                  },
                  {
                    label: `Спросить у AI (${selectedVulns.length})`,
                    disabled: selectedVulns.length === 0,
                    onClick: handleBulkAskAi,
                  },
                  {
                    label: `Объединить и отправить в Jira (${selectedVulns.length})`,
                    disabled: selectedVulns.length === 0,
                    onClick: handleBulkSendToJira,
                  },
                  {
                    label: `Связать с Jira (${selectedVulns.length})`,
                    disabled: selectedVulns.length === 0,
                    onClick: handleBulkLinkWithJira,
                  },
                  {
                    label: `Синхронизировать с Jira (${selectedVulns.length})`,
                    disabled: selectedVulns.length === 0,
                    onClick: handleBulkSyncWithJira,
                  },
                  {
                    label: `Отвязать от Jira (${selectedVulns.length})`,
                    disabled: selectedVulns.length === 0,
                    onClick: handleBulkUnsyncWithJira,
                  },
                  {
                    label: `Изменить критичность (${selectedVulns.length})`,
                    disabled: selectedVulns.length === 0,
                    onClick: handleBulkChangeSeverity,
                  },
                 ]}
              />
              </div>
            </div>
          )}
        </div>
      </div>

      <AiChatDialog
        open={openAiChat}
        onOpenChange={(open) => {
          setOpenAiChat(open);
          if (!open) {
            setAiFindingIds([]);
            setActiveVuln(null);
          }
        }}
        findingIds={aiFindingIds}
      />

      <DescriptionDialog
        open={openDescription}
        onOpenChange={(open) => {
          setOpenDescription(open);
          if (!open) {
            setDescriptionFindingIds([]);
            setIsBulkDescription(false);
          }
        }}
        findingIds={descriptionFindingIds}
        isBulk={isBulkDescription}
      />

      <JiraLinkDialog
        open={openJiraLink}
        onOpenChange={(open) => {
          setOpenJiraLink(open);
          if (!open) {
            setActiveVuln(null);
            setIsBulkJiraLink(false);
          }
        }}
        isBulk={isBulkJiraLink}
        selectedCount={selectedVulns.length}
        saving={linkSaving}
        canSave={Boolean(activeVuln) || isBulkJiraLink}
        onSave={handleSaveJiraLink}
      />

      <SeverityDialog
        key={`${openSeverityChange}-${activeVuln?.id ?? "bulk"}`}
        open={openSeverityChange}
        onOpenChange={(open) => {
          setOpenSeverityChange(open);
          if (!open) {
            setActiveVuln(null);
            setIsBulkSeverityChange(false);
          }
        }}
        isBulk={isBulkSeverityChange}
        selectedCount={selectedVulns.length}
        currentSeverity={activeVuln?.severity ?? ""}
        saving={severitySaving}
        canSave={Boolean(activeVuln) || isBulkSeverityChange}
        onSave={handleSaveSeverity}
      />
    </>
  );
}
