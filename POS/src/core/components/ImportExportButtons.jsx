import React, { useRef, useState } from "react";
import { Download, Upload } from "feather-icons-react/build/IconComponents";
import { toast } from "react-toastify";
import { downloadExcelExport, uploadExcelImport } from "../../redux/utils/excelTransfer";

/**
 * Excel export / import controls for list screens.
 * Import only shown when `canImport` is true (resource supports /import-excel).
 */
const ImportExportButtons = ({
  resourcePath,
  exportFileName,
  canImport = false,
  onImported,
}) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const onExport = async () => {
    if (!resourcePath) return;
    setBusy(true);
    try {
      await downloadExcelExport(resourcePath, exportFileName || "export.xlsx");
      toast.success("Export downloaded");
    } catch (err) {
      toast.error(err.message || "Export failed");
    } finally {
      setBusy(false);
    }
  };

  const onPickImport = () => {
    if (!canImport || busy) return;
    inputRef.current?.click();
  };

  const onImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const result = await uploadExcelImport(resourcePath, file);
      toast.success(
        result?.message ||
          `Imported ${result?.inserted ?? 0} row(s)${
            result?.skipped ? `, skipped ${result.skipped}` : ""
          }`,
      );
      onImported?.(result);
    } catch (err) {
      toast.error(err.message || "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modern-crud-io-btns">
      <button
        type="button"
        className="btn modern-crud-io-btn"
        onClick={onExport}
        disabled={busy || !resourcePath}
        title="Export Excel"
      >
        <Download size={15} />
        Export
      </button>
      {canImport ? (
        <>
          <button
            type="button"
            className="btn modern-crud-io-btn"
            onClick={onPickImport}
            disabled={busy}
            title="Import Excel"
          >
            <Upload size={15} />
            Import
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="d-none"
            onChange={onImportFile}
          />
        </>
      ) : null}
    </div>
  );
};

export default ImportExportButtons;
