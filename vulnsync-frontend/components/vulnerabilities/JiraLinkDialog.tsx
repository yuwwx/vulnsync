"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isBulk: boolean;
  selectedCount: number;
  saving: boolean;
  canSave: boolean;
  onSave: (jiraKey: string) => void;
}

// Диалог привязки уязвимостей к существующей задаче Jira по ключу.
export function JiraLinkDialog({
  open,
  onOpenChange,
  isBulk,
  selectedCount,
  saving,
  canSave,
  onSave,
}: Props) {
  const [jiraKey, setJiraKey] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          // Готовим диалог к следующему открытию
          setJiraKey("");
        }
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Связать с Jira</DialogTitle>
          <DialogDescription>
            {isBulk
              ? `Укажите ключ задачи для ${selectedCount} уязвимостей`
              : "Укажите ключ задачи"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Label>Key</Label>
          <Input
            placeholder="PROJECT-..."
            value={jiraKey}
            onChange={(e) => setJiraKey(e.target.value)}
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Отмена</Button>
          </DialogClose>
          <Button
            onClick={() => onSave(jiraKey.trim())}
            disabled={!canSave || saving}
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
