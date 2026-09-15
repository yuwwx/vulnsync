"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DefectDojoFinding,
  ProductsService,
} from "@/services/products.service";
import { VulnerabilitiesService } from "@/services/vulnerabilities.service";
import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Уязвимости, для которых показываем описание: одна (single-режим) или несколько (bulk). */
  findingIds: number[];
  isBulk: boolean;
}

// Диалог с готовым описанием для Jira. В single-режиме дополнительно
// можно раскрыть исходные данные finding из DefectDojo (JSON).
export function DescriptionDialog({
  open,
  onOpenChange,
  findingIds,
  isBulk,
}: Props) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [rawFinding, setRawFinding] = useState<DefectDojoFinding | null>(null);
  const [rawLoading, setRawLoading] = useState(false);

  // Только асинхронные обновления состояния: вызывается из эффекта.
  const loadDescription = useCallback((ids: number[]) => {
    return VulnerabilitiesService.previewJiraDescription(ids)
      .then(({ description }) => setDescription(description))
      .catch(() => toast.error("Не удалось сгенерировать описание"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (open && findingIds.length > 0) {
      void loadDescription(findingIds);
    }
  }, [open, findingIds, loadDescription]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(description);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const loadRawFinding = () => {
    if (rawFinding || rawLoading || findingIds.length === 0) return;

    setRawLoading(true);
    ProductsService.getDefectDojoFinding(findingIds[0])
      .then(setRawFinding)
      .catch(() => toast.error("Не удалось загрузить исходные данные"))
      .finally(() => setRawLoading(false));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          // Готовим диалог к следующему открытию
          setDescription("");
          setRawFinding(null);
          setCopied(false);
          setLoading(true);
        }
      }}
    >
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Описание уязвимости</DialogTitle>
        </DialogHeader>

        {findingIds.length > 0 && (
          <div className="space-y-4 text-sm">
            {loading ? (
              <div>Загрузка...</div>
            ) : (
              description
                .split("\n")
                .map((line, i) => <div key={i}>{line || "\u00A0"}</div>)
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="flex gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  Скопировано
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Скопировать
                </>
              )}
            </Button>
            {!isBulk && (
              <Accordion
                type="single"
                collapsible
                onValueChange={(value) => {
                  if (value === "raw") {
                    loadRawFinding();
                  }
                }}
              >
                <AccordionItem value="raw">
                  <AccordionTrigger>Исходные данные (JSON)</AccordionTrigger>
                  <AccordionContent>
                    {rawLoading ? (
                      <div className="text-sm text-muted-foreground">
                        Загрузка…
                      </div>
                    ) : (
                      <pre className="bg-muted p-3 rounded-md h-[60vh] overflow-auto break-words whitespace-pre-wrap">
                        {rawFinding
                          ? JSON.stringify(rawFinding, null, 2)
                          : "—"}
                      </pre>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
