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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SEVERITY_ORDER } from "@/constants/severity";
import { useState } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isBulk: boolean;
  selectedCount: number;
  /** Текущая критичность — предзаполняется в single-режиме. */
  currentSeverity: string;
  saving: boolean;
  canSave: boolean;
  onSave: (severity: string) => void;
}

// Диалог изменения критичности finding'а в DefectDojo.
export function SeverityDialog({
  open,
  onOpenChange,
  isBulk,
  selectedCount,
  currentSeverity,
  saving,
  canSave,
  onSave,
}: Props) {
  const [severity, setSeverity] = useState(currentSeverity);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Изменить критичность</DialogTitle>
          <DialogDescription>
            {isBulk
              ? `Новая критичность будет применена к ${selectedCount} уязвимостям.`
              : "Новая критичность будет сохранена в DefectDojo, а finding отмечен как Verified."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Label htmlFor="severity">Критичность</Label>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger id="severity">
              <SelectValue placeholder="Выберите критичность" />
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_ORDER.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Отмена</Button>
          </DialogClose>
          <Button
            onClick={() => onSave(severity)}
            disabled={!canSave || !severity || saving}
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
