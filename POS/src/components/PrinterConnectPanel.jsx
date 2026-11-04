import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Printer, RefreshCw, Check, XCircle } from "feather-icons-react/build/IconComponents";
import { toast } from "react-toastify";
import { fetchPrinters } from "../utils/invoicePrint";
import * as settingService from "../redux/settings/settingService";
import { fetchSettingsSuccess } from "../redux/settings/settingSlice";

/**
 * List system printers and connect/disconnect the preferred receipt printer.
 * `compact` fits the header dropdown; full layout is for settings.
 */
const PrinterConnectPanel = ({ compact = false, autoLoad = true }) => {
  const dispatch = useDispatch();
  const settings = useSelector((state) => state.settings?.settings);
  const connectedPrinter = String(settings?.invoiceDesign?.connectedPrinter || "").trim();

  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState("");

  const loadPrinters = useCallback(async ({ silent } = {}) => {
    setLoading(true);
    try {
      const list = await fetchPrinters();
      setPrinters(list);
      if (!silent && !list.length) {
        toast.info("No printers found on this machine");
      }
    } catch (err) {
      setPrinters([]);
      if (!silent) toast.error(err?.message || "Could not list printers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) loadPrinters({ silent: true });
  }, [autoLoad, loadPrinters]);

  const persistPrinter = async (name) => {
    const nextName = String(name || "").trim();
    setSaving(nextName || "__disconnect__");
    try {
      const result = await settingService.updateSettings({
        invoiceDesign: {
          ...(settings?.invoiceDesign || {}),
          connectedPrinter: nextName,
        },
      });
      const nextSettings = result?.settings ?? result;
      if (nextSettings) dispatch(fetchSettingsSuccess(nextSettings));
      if (nextName) toast.success(`Connected to ${nextName}`);
      else toast.info("Printer disconnected");
    } catch (err) {
      toast.error(err?.message || "Could not save printer connection");
    } finally {
      setSaving("");
    }
  };

  const handleConnect = (e, name) => {
    e.preventDefault();
    e.stopPropagation();
    if (!name || name === connectedPrinter) return;
    persistPrinter(name);
  };

  const handleDisconnect = (e) => {
    e.preventDefault();
    e.stopPropagation();
    persistPrinter("");
  };

  const handleRefresh = (e) => {
    e.preventDefault();
    e.stopPropagation();
    loadPrinters();
  };

  if (compact) {
    return (
      <div className="printer-connect-panel is-compact" onClick={(e) => e.stopPropagation()}>
        <div className="printer-connect-head">
          <span className="printer-connect-title">
            <Printer size={14} />
            Printers
          </span>
          <button
            type="button"
            className="btn btn-sm printer-connect-refresh"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh printers"
          >
            <RefreshCw size={13} className={loading ? "spin" : undefined} />
          </button>
        </div>
        {connectedPrinter ? (
          <div className="printer-connect-active">
            <span title={connectedPrinter}>Connected: {connectedPrinter}</span>
            <button type="button" className="btn btn-sm btn-link p-0" onClick={handleDisconnect}>
              <XCircle size={13} /> Disconnect
            </button>
          </div>
        ) : (
          <div className="printer-connect-hint">Select a printer to connect</div>
        )}
        <div className="printer-connect-list">
          {loading && !printers.length ? (
            <div className="printer-connect-empty">Loading printers…</div>
          ) : null}
          {!loading && !printers.length ? (
            <div className="printer-connect-empty">No printers found</div>
          ) : null}
          {printers.map((p) => {
            const name = p?.name || "";
            const isConnected = name && name === connectedPrinter;
            return (
              <button
                key={name}
                type="button"
                className={`printer-connect-item${isConnected ? " is-connected" : ""}`}
                disabled={!name || saving === name}
                onClick={(e) => handleConnect(e, name)}
              >
                <span className="printer-connect-item-copy">
                  <strong>{name}</strong>
                  {p?.status ? <small>{p.status}</small> : null}
                </span>
                <span className="printer-connect-item-action">
                  {isConnected ? (
                    <>
                      <Check size={13} /> Connected
                    </>
                  ) : (
                    "Connect"
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="printer-connect-panel is-full">
      <div className="d-flex align-items-start justify-content-between gap-3 mb-3 flex-wrap">
        <div>
          <h5 className="mb-1">Connect printer</h5>
          <p className="text-muted mb-0">
            Choose the Windows printer POSHub uses for receipts and invoices.
          </p>
        </div>
        <button
          type="button"
          className="btn branding-upload-btn"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "spin" : undefined} />
          {loading ? "Refreshing…" : "Refresh list"}
        </button>
      </div>

      <div
        className="branding-theme-swatch mb-3 d-flex align-items-center justify-content-between gap-3 flex-wrap"
        style={{ background: "#182c25", color: "#e6efe9", borderColor: "#306844" }}
      >
        <div className="d-flex align-items-center gap-2">
          <Printer size={18} />
          <div>
            <div className="small opacity-75">Connected printer</div>
            <strong>{connectedPrinter || "None — connect a printer below"}</strong>
          </div>
        </div>
        {connectedPrinter ? (
          <button type="button" className="btn btn-sm btn-light" onClick={handleDisconnect}>
            Disconnect
          </button>
        ) : null}
      </div>

      <div className="printer-connect-list is-card">
        {loading && !printers.length ? (
          <div className="printer-connect-empty">Loading printers…</div>
        ) : null}
        {!loading && !printers.length ? (
          <div className="printer-connect-empty">
            No printers found. Make sure a printer is installed on this computer and try Refresh.
          </div>
        ) : null}
        {printers.map((p) => {
          const name = p?.name || "";
          const isConnected = name && name === connectedPrinter;
          return (
            <div
              key={name}
              className={`printer-connect-row${isConnected ? " is-connected" : ""}`}
            >
              <div>
                <strong>{name}</strong>
                <div className="text-muted small">
                  {[p?.driver, p?.port, p?.status].filter(Boolean).join(" · ")}
                </div>
              </div>
              <button
                type="button"
                className={`btn btn-sm ${isConnected ? "btn-success" : "btn-primary"}`}
                disabled={!name || isConnected || saving === name}
                onClick={(e) => handleConnect(e, name)}
              >
                {isConnected ? (
                  <>
                    <Check size={14} className="me-1" /> Connected
                  </>
                ) : (
                  "Connect"
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PrinterConnectPanel;
