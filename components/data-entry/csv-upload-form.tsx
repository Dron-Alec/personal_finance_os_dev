"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { importCsv } from "@/lib/actions/transactions";
import { confirmCustomFormatAndImport } from "@/lib/actions/custom-bank-formats";
import { extractHeaderSample } from "@/lib/csv-parsing";
import { matchHeaders, type ColumnMapping } from "@/lib/import/csv-header-matcher";
import { applyMapping, type MappedTransaction } from "@/lib/import/apply-mapping";
import { BANK_FORMATS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatementFormatSelect, OTHER_FORMAT } from "@/components/data-entry/statement-format-select";

export function CsvUploadForm({
  bankShortlist = [],
  customFormats = [],
}: {
  bankShortlist?: string[];
  customFormats?: string[];
}) {
  const [bankFormat, setBankFormat] = useState<string>(bankShortlist[0] ?? BANK_FORMATS[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const [newFormatName, setNewFormatName] = useState("");
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<MappedTransaction[]>([]);

  const isOther = bankFormat === OTHER_FORMAT;

  function resetOtherState() {
    setMapping(null);
    setPreviewError(null);
    setPreviewRows([]);
  }

  async function handleDetect() {
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) {
      toast.error("Choose at least one CSV file first.");
      return;
    }
    const text = await files[0].text();
    const { columns, rows, sampleValuesByColumn } = extractHeaderSample(text);
    if (columns.length === 0) {
      setPreviewError("Couldn't read any columns from that file.");
      return;
    }
    const detected = matchHeaders({ headers: columns, sampleValuesByColumn });
    if (detected.missingRequiredFields.length > 0 || detected.confidence === "low") {
      setPreviewError(
        "Couldn't confidently detect this format's columns — this bank isn't supported yet. Double-check you picked the right file.",
      );
      setMapping(null);
      return;
    }
    setPreviewError(null);
    setMapping(detected);
    setPreviewRows(applyMapping(detected, rows).slice(0, 3));
  }

  function handleNormalImport() {
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) {
      toast.error("Choose at least one CSV file.");
      return;
    }
    const formData = new FormData();
    formData.set("bankFormat", bankFormat);
    for (const file of Array.from(files)) formData.append("files", file);

    startTransition(async () => {
      const result = await importCsv({}, formData);
      if ("imported" in result && result.imported !== undefined) {
        toast.success(
          `Imported ${result.imported} transaction${result.imported === 1 ? "" : "s"} (${result.duplicates} duplicate${result.duplicates === 1 ? "" : "s"} skipped).`,
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  }

  function handleConfirmOther() {
    if (!mapping) return;
    const name = newFormatName.trim();
    if (!name) {
      toast.error("Give this format a name (e.g. the bank's name).");
      return;
    }
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) {
      toast.error("Choose at least one CSV file.");
      return;
    }
    const formData = new FormData();
    formData.set("name", name);
    formData.set("mapping", JSON.stringify(mapping));
    for (const file of Array.from(files)) formData.append("files", file);

    startTransition(async () => {
      const result = await confirmCustomFormatAndImport({}, formData);
      if ("imported" in result && result.imported !== undefined) {
        toast.success(
          `Saved "${name}" and imported ${result.imported} transaction${result.imported === 1 ? "" : "s"} (${result.duplicates} duplicate${result.duplicates === 1 ? "" : "s"} skipped).`,
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
        setNewFormatName("");
        resetOtherState();
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bankFormat">Statement Format</Label>
          <StatementFormatSelect
            id="bankFormat"
            value={bankFormat}
            onChange={(v) => {
              setBankFormat(v);
              resetOtherState();
            }}
            bankShortlist={bankShortlist}
            customFormats={customFormats}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="files">CSV files (multiple OK)</Label>
          <input
            ref={fileInputRef}
            id="files"
            type="file"
            accept=".csv"
            multiple
            onChange={isOther ? resetOtherState : undefined}
            className="border-input rounded-md border bg-transparent text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
          />
        </div>
        {!isOther && (
          <Button type="button" disabled={pending} onClick={handleNormalImport}>
            {pending ? "Importing…" : "Import Transactions"}
          </Button>
        )}
      </div>

      {isOther && (
        <div className="flex flex-col gap-3 rounded-md border border-dashed p-3">
          <p className="text-sm text-muted-foreground">
            Pick a CSV from the new bank above, then detect its columns. Nothing imports until you
            confirm the detected mapping looks right — and once confirmed, this format is saved so
            it (and everyone else who banks there) can just pick it from the list next time.
          </p>
          <div className="flex flex-col gap-1.5 sm:max-w-xs">
            <Label htmlFor="new-format-name">Format name (e.g. the bank&apos;s name)</Label>
            <Input
              id="new-format-name"
              value={newFormatName}
              onChange={(e) => setNewFormatName(e.target.value)}
              placeholder="e.g. US Bank Checking"
            />
          </div>

          {!mapping && (
            <Button type="button" variant="outline" className="w-fit" onClick={handleDetect} disabled={pending}>
              Detect columns from file
            </Button>
          )}

          {previewError && <p className="text-sm text-destructive">{previewError}</p>}

          {mapping && (
            <div className="flex flex-col gap-2 rounded-md bg-muted/50 p-3 text-sm">
              <p className="font-medium">
                Detected ({mapping.confidence} confidence): date=&quot;{mapping.dateColumn}&quot;,
                description=&quot;{mapping.descriptionColumn}&quot;, amount=&quot;
                {mapping.amountColumn ?? `${mapping.debitColumn}/${mapping.creditColumn}`}&quot;
              </p>
              {mapping.notes.length > 0 && (
                <ul className="list-disc pl-4 text-xs text-muted-foreground">
                  {mapping.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              )}
              {previewRows.length > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground">Sample parsed rows:</p>
                  {previewRows.map((r, i) => (
                    <p key={i} className="font-mono text-xs">
                      {r.date} — {r.description} — {r.amount}
                    </p>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button type="button" size="sm" onClick={handleConfirmOther} disabled={pending}>
                  {pending ? "Importing…" : "Looks right — import & save format"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={resetOtherState} disabled={pending}>
                  Re-detect
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Don&apos;t have a statement handy? Log into your bank or card&apos;s website, go to
        Transaction History, and export one month at a time to CSV (or Excel, then re-save as
        CSV).
      </p>
    </div>
  );
}
