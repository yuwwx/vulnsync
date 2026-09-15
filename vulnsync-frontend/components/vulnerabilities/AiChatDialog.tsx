"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  AiMessage,
  VulnerabilitiesService,
} from "@/services/vulnerabilities.service";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  findingIds: number[];
}

// Диалог AI-анализа: при открытии сам запрашивает анализ выбранных уязвимостей,
// дальше позволяет уточнять ответ в переписке.
export function AiChatDialog({ open, onOpenChange, findingIds }: Props) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);

  // Только асинхронные обновления состояния: вызывается из эффекта и обработчиков.
  const requestAi = useCallback((ids: number[], history: AiMessage[] = []) => {
    return VulnerabilitiesService.askAi(ids, history)
      .then(({ message }) => {
        setMessages((current) => [...current, message]);
      })
      .catch((err) => {
        const response = (
          err as { response?: { data?: { message?: string | string[] } } }
        ).response;
        const text = response?.data?.message;
        toast.error(
          Array.isArray(text)
            ? text.join(", ")
            : text || "Не удалось получить ответ AI",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (open && findingIds.length > 0) {
      void requestAi(findingIds);
    }
  }, [open, findingIds, requestAi]);

  const handleSend = async () => {
    const content = prompt.trim();
    if (!content || loading) return;
    const userMessage: AiMessage = { role: "user", content };
    setPrompt("");
    setMessages((current) => [...current, userMessage]);
    setLoading(true);
    await requestAi(findingIds, [...messages, userMessage]);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          // Готовим диалог к следующему открытию
          setMessages([]);
          setPrompt("");
        }
      }}
    >
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Спросить у AI</DialogTitle>
          <DialogDescription>
            Анализ уязвимости и продолжение диалога с Application Security
            Engineer.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 max-h-[55vh] space-y-4 overflow-y-auto rounded-md border p-4">
          {messages.length === 0 && !loading && (
            <div className="text-sm text-muted-foreground">
              Подготавливаем анализ...
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={
                message.role === "user"
                  ? "ml-8 rounded-md bg-muted p-3"
                  : "mr-8 rounded-md bg-blue-50 p-3"
              }
            >
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                {message.role === "user" ? "Вы" : "AI"}
              </div>
              <div className="whitespace-pre-wrap text-sm">{message.content}</div>
            </div>
          ))}
          {loading && (
            <div className="text-sm text-muted-foreground">AI печатает...</div>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Задайте уточняющий вопрос..."
            disabled={loading}
          />
          <Button
            onClick={() => void handleSend()}
            disabled={!prompt.trim() || loading}
          >
            Отправить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
