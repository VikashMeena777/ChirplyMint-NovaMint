"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  exportLeadsCSV,
  exportLeadsWebhook,
  testWebhook,
  getExportHistory,
  type LeadExportRecord,
} from "@/lib/actions/export";
import {
  Download,
  Webhook,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  FileSpreadsheet,
  Loader2,
  ArrowLeft,
  History,
  Zap,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

export default function LeadExportPage() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [exportHistory, setExportHistory] = useState<LeadExportRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setHistoryLoading(true);
    const result = await getExportHistory();
    if (result.data) {
      setExportHistory(result.data as LeadExportRecord[]);
    }
    setHistoryLoading(false);
  };

  const handleCSVExport = async () => {
    setLoading(true);
    const result = await exportLeadsCSV();
    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      // Trigger download
      const blob = new Blob([result.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chirplymint-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`Exported ${result.count} leads as CSV!`);
      await loadHistory();
    }
    setLoading(false);
  };

  const handleWebhookExport = async () => {
    if (!webhookUrl.trim()) {
      toast.error("Please enter a webhook URL");
      return;
    }
    setLoading(true);
    const result = await exportLeadsWebhook(webhookUrl.trim());
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Sent ${result.count} leads to webhook!`);
      await loadHistory();
    }
    setLoading(false);
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast.error("Please enter a webhook URL first");
      return;
    }
    setTesting(true);
    const result = await testWebhook(webhookUrl.trim());
    if (result.error) {
      toast.error(`Test failed: ${result.error}`);
    } else {
      toast.success(result.message || "Test payload sent!");
    }
    setTesting(false);
  };

  return (
    <div className="export-page">
      {/* Header */}
      <div className="export-header">
        <Link href="/dashboard/leads" className="back-link">
          <ArrowLeft size={16} /> Back to Leads
        </Link>
        <div className="header-content">
          <h1>Export Leads</h1>
          <p>Download your leads as CSV or push them to any webhook endpoint.</p>
        </div>
      </div>

      {/* Export Options */}
      <div className="export-grid">
        {/* CSV Export */}
        <div className="export-card">
          <div className="card-icon csv">
            <FileSpreadsheet size={24} />
          </div>
          <h3>CSV Download</h3>
          <p>
            Export all your leads as a CSV file. Compatible with Excel, Google
            Sheets, Notion, and any CRM.
          </p>
          <ul className="features-list">
            <li>
              <CheckCircle2 size={14} /> All lead fields included
            </li>
            <li>
              <CheckCircle2 size={14} /> Automation name mapped
            </li>
            <li>
              <CheckCircle2 size={14} /> Ready for spreadsheet import
            </li>
          </ul>
          <button
            className="export-btn primary"
            onClick={handleCSVExport}
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <Download size={16} />
            )}
            Download CSV
          </button>
        </div>

        {/* Webhook Export */}
        <div className="export-card">
          <div className="card-icon webhook">
            <Webhook size={24} />
          </div>
          <h3>Webhook Push</h3>
          <p>
            Send all leads as JSON to any webhook URL. Works with Zapier, Make,
            n8n, or your custom API.
          </p>

          <div className="webhook-form">
            <label>Webhook URL</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.zapier.com/..."
            />

            <div className="webhook-actions">
              <button
                className="test-btn"
                onClick={handleTestWebhook}
                disabled={testing || !webhookUrl.trim()}
              >
                {testing ? (
                  <Loader2 size={14} className="spin" />
                ) : (
                  <Zap size={14} />
                )}
                Test
              </button>
              <button
                className="export-btn primary"
                onClick={handleWebhookExport}
                disabled={loading || !webhookUrl.trim()}
              >
                {loading ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <Send size={16} />
                )}
                Send All Leads
              </button>
            </div>

            <div className="webhook-info">
              <AlertTriangle size={12} />
              <span>
                Test first to verify your endpoint. The payload includes all
                leads as a JSON array.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Export History */}
      <div className="history-section">
        <h2>
          <History size={18} /> Export History
        </h2>

        {historyLoading ? (
          <div className="history-loading">
            <div className="skeleton-bar" />
            <div className="skeleton-bar short" />
          </div>
        ) : exportHistory.length === 0 ? (
          <div className="history-empty">
            <p>No exports yet. Export your first batch above!</p>
          </div>
        ) : (
          <div className="history-table">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Destination</th>
                  <th>Records</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {exportHistory.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <span className={`type-badge ${record.export_type}`}>
                        {record.export_type === "csv" ? (
                          <FileSpreadsheet size={12} />
                        ) : (
                          <Webhook size={12} />
                        )}
                        {record.export_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="destination-cell">
                      {record.destination
                        ? record.destination.slice(0, 40) +
                          (record.destination.length > 40 ? "..." : "")
                        : "—"}
                    </td>
                    <td>{record.records_exported}</td>
                    <td>
                      <span
                        className={`status-badge ${record.status}`}
                      >
                        {record.status === "completed" ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <XCircle size={12} />
                        )}
                        {record.status}
                      </span>
                    </td>
                    <td className="date-cell">
                      {new Date(record.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .export-page {
          max-width: 900px;
          margin: 0 auto;
          padding: 0 1rem;
        }

        /* ── Header ── */
        .export-header {
          margin-bottom: 2rem;
        }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          color: #REDACTED_SECRETS;
          font-size: 0.85rem;
          text-decoration: none;
          margin-bottom: 1rem;
          transition: opacity 0.2s;
        }
        .back-link:hover {
          opacity: 0.8;
        }
        .header-content h1 {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--foreground);
          margin: 0 0 0.4rem;
        }
        .header-content p {
          color: var(--muted-foreground);
          font-size: 0.9rem;
          margin: 0;
        }

        /* ── Export Grid ── */
        .export-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }
        @media (max-width: 768px) {
          .export-grid {
            grid-template-columns: 1fr;
          }
        }

        .export-card {
          background: var(--card);
          border: 1px solid oklch(0.52 0.19 162 / 15%);
          border-radius: 1rem;
          padding: 1.75rem;
          transition: border-color 0.3s;
        }
        .export-card:hover {
          border-color: oklch(0.52 0.19 162 / 35%);
        }

        .card-icon {
          width: 48px;
          height: 48px;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }
        .card-icon.csv {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05));
          color: #22c55e;
        }
        .card-icon.webhook {
          background: linear-gradient(135deg, oklch(0.52 0.19 162 / 15%), oklch(0.52 0.19 162 / 5%));
          color: #REDACTED_SECRETS;
        }

        .export-card h3 {
          margin: 0 0 0.5rem;
          font-size: 1.1rem;
          color: var(--foreground);
        }
        .export-card > p {
          color: var(--muted-foreground);
          font-size: 0.82rem;
          line-height: 1.5;
          margin: 0 0 1rem;
        }

        .features-list {
          list-style: none;
          padding: 0;
          margin: 0 0 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .features-list li {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.78rem;
          color: var(--muted-foreground);
        }
        .features-list li :global(svg) {
          color: #22c55e;
        }

        /* ── Buttons ── */
        .export-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.25rem;
          border: none;
          border-radius: 0.6rem;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .export-btn.primary {
          background: linear-gradient(135deg, #REDACTED_SECRETS, oklch(0.45 0.2 158));
          color: white;
        }
        .export-btn.primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px oklch(0.52 0.19 162 / 30%);
        }
        .export-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .test-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1rem;
          border: 1px solid oklch(0.52 0.19 162 / 30%);
          border-radius: 0.5rem;
          background: transparent;
          color: #REDACTED_SECRETS;
          font-size: 0.82rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .test-btn:hover:not(:disabled) {
          background: oklch(0.52 0.19 162 / 10%);
        }
        .test-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* ── Webhook Form ── */
        .webhook-form {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .webhook-form label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--muted-foreground);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .webhook-form input {
          width: 100%;
          padding: 0.6rem 0.85rem;
          border: 1px solid oklch(0.52 0.19 162 / 20%);
          border-radius: 0.5rem;
          background: var(--card);
          color: var(--foreground);
          font-size: 0.85rem;
          font-family: 'JetBrains Mono', monospace;
        }
        .webhook-form input:focus {
          outline: none;
          border-color: #REDACTED_SECRETS;
          box-shadow: 0 0 0 2px oklch(0.52 0.19 162 / 15%);
        }
        .webhook-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.25rem;
        }
        .webhook-info {
          display: flex;
          align-items: flex-start;
          gap: 0.4rem;
          font-size: 0.72rem;
          color: var(--muted-foreground);
          margin-top: 0.25rem;
        }
        .webhook-info :global(svg) {
          color: #eab308;
          min-width: 12px;
          margin-top: 1px;
        }

        /* ── History ── */
        .history-section {
          margin-bottom: 3rem;
        }
        .history-section h2 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.15rem;
          color: var(--foreground);
          margin: 0 0 1.25rem;
        }
        .history-loading {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .skeleton-bar {
          height: 2rem;
          background: oklch(0.52 0.19 162 / 10%);
          border-radius: 0.5rem;
          animation: pulse 1.5s ease-in-out infinite;
        }
        .skeleton-bar.short {
          width: 60%;
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }
        .history-empty {
          text-align: center;
          padding: 2rem;
          border: 1px dashed oklch(0.52 0.19 162 / 20%);
          border-radius: 0.75rem;
        }
        .history-empty p {
          color: var(--muted-foreground);
          font-size: 0.85rem;
          margin: 0;
        }

        .history-table {
          overflow-x: auto;
          border: 1px solid oklch(0.52 0.19 162 / 15%);
          border-radius: 0.75rem;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          padding: 0.75rem 1rem;
          text-align: left;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--muted-foreground);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid oklch(0.52 0.19 162 / 10%);
          background: var(--muted);
        }
        td {
          padding: 0.65rem 1rem;
          font-size: 0.82rem;
          color: var(--foreground);
          border-bottom: 1px solid oklch(0.52 0.19 162 / 6%);
        }
        tr:last-child td {
          border-bottom: none;
        }
        .destination-cell {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
          color: var(--muted-foreground);
        }
        .date-cell {
          white-space: nowrap;
          color: var(--muted-foreground);
          font-size: 0.78rem;
        }
        .type-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.2rem 0.5rem;
          border-radius: 0.3rem;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .type-badge.csv {
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
        }
        .type-badge.webhook {
          background: oklch(0.52 0.19 162 / 10%);
          color: #REDACTED_SECRETS;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.75rem;
        }
        .status-badge.completed {
          color: #22c55e;
        }
        .status-badge.failed {
          color: #ef4444;
        }

        :global(.spin) {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
