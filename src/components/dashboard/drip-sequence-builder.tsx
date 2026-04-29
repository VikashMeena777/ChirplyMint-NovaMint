"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  getDripSequence,
  createDripSequence,
  toggleDripSequence,
  addDripStep,
  updateDripStep,
  deleteDripStep,
  getDripStats,
  type DripStep,
  type DripSequence,
} from "@/lib/actions/drip-sequences";
import {
  Clock,
  Plus,
  Trash2,
  Save,
  Power,
  PowerOff,
  ChevronDown,
  ChevronUp,
  Zap,
  Users,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Loader2,
} from "lucide-react";

interface DripSequenceBuilderProps {
  automationId: string;
  userPlan: string;
}

const DELAY_PRESETS = [
  { label: "1 hour", hours: 1 },
  { label: "6 hours", hours: 6 },
  { label: "12 hours", hours: 12 },
  { label: "1 day", hours: 24 },
  { label: "2 days", hours: 48 },
  { label: "3 days", hours: 72 },
  { label: "5 days", hours: 120 },
  { label: "7 days", hours: 168 },
];

function formatDelay(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const remaining = hours % 24;
  if (remaining === 0) return `${days}d`;
  return `${days}d ${remaining}h`;
}

export default function DripSequenceBuilder({
  automationId,
  userPlan,
}: DripSequenceBuilderProps) {
  const [sequence, setSequence] = useState<DripSequence | null>(null);
  const [steps, setSteps] = useState<DripStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [stats, setStats] = useState({
    active: 0,
    completed: 0,
    cancelled: 0,
    failed: 0,
    total: 0,
  });
  const [newStep, setNewStep] = useState({
    delay_hours: 24,
    message_text: "",
  });

  const loadSequence = useCallback(async () => {
    setLoading(true);
    const result = await getDripSequence(automationId);
    if (result.data) {
      setSequence(result.data);
      setSteps((result.data.steps as DripStep[]) || []);
    }
    const statsResult = await getDripStats(automationId);
    setStats(statsResult);
    setLoading(false);
  }, [automationId]);

  useEffect(() => {
    loadSequence();
  }, [loadSequence]);

  const handleCreateSequence = async () => {
    setSaving(true);
    const result = await createDripSequence(automationId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Drip sequence created!");
      await loadSequence();
    }
    setSaving(false);
  };

  const handleToggle = async () => {
    if (!sequence) return;
    setSaving(true);
    const result = await toggleDripSequence(sequence.id, !sequence.is_active);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(
        sequence.is_active ? "Drip sequence paused" : "Drip sequence activated!"
      );
      await loadSequence();
    }
    setSaving(false);
  };

  const handleAddStep = async () => {
    if (!sequence) return;
    if (!newStep.message_text.trim()) {
      toast.error("Message text is required");
      return;
    }
    setSaving(true);
    const result = await addDripStep(sequence.id, {
      delay_hours: newStep.delay_hours,
      message_text: newStep.message_text.trim(),
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Step added!");
      setNewStep({ delay_hours: 24, message_text: "" });
      await loadSequence();
    }
    setSaving(false);
  };

  const handleUpdateStep = async (
    stepId: string,
    updates: { delay_hours?: number; message_text?: string }
  ) => {
    setSaving(true);
    const result = await updateDripStep(stepId, updates);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Step updated!");
      await loadSequence();
    }
    setSaving(false);
  };

  const handleDeleteStep = async (stepId: string) => {
    setSaving(true);
    const result = await deleteDripStep(stepId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Step removed");
      await loadSequence();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="drip-builder-skeleton">
        <div className="skeleton-bar" />
        <div className="skeleton-bar short" />
        <style jsx>{`
          .drip-builder-skeleton {
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
          .skeleton-bar {
            height: 2rem;
            background: rgba(139, 92, 246, 0.1);
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
        `}</style>
      </div>
    );
  }

  // No sequence yet — show create button
  if (!sequence) {
    return (
      <div className="drip-empty">
        <div className="drip-empty-icon">
          <Zap size={32} />
        </div>
        <h4>Enable Drip Sequence</h4>
        <p>
          Send automated follow-up DMs over time. Perfect for nurturing leads
          and increasing conversions.
        </p>
        <button
          className="drip-create-btn"
          onClick={handleCreateSequence}
          disabled={saving}
        >
          {saving ? (
            <Loader2 size={16} className="spin" />
          ) : (
            <Zap size={16} />
          )}
          Enable Drip Sequence
        </button>

        <style jsx>{`
          .drip-empty {
            text-align: center;
            padding: 2rem;
            border: 2px dashed rgba(139, 92, 246, 0.3);
            border-radius: 1rem;
            background: rgba(139, 92, 246, 0.03);
          }
          .drip-empty-icon {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(168, 85, 247, 0.15));
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1rem;
            color: #8b5cf6;
          }
          h4 {
            margin: 0 0 0.5rem;
            color: #e2e8f0;
            font-size: 1.1rem;
          }
          p {
            color: #94a3b8;
            font-size: 0.85rem;
            margin: 0 0 1.25rem;
            max-width: 320px;
            margin-left: auto;
            margin-right: auto;
          }
          .drip-create-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.65rem 1.5rem;
            background: linear-gradient(135deg, #8b5cf6, #a855f7);
            color: white;
            border: none;
            border-radius: 0.6rem;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }
          .drip-create-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
          }
          .drip-create-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
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

  return (
    <div className="drip-builder">
      {/* Header: Toggle + Stats */}
      <div className="drip-header">
        <div className="drip-header-left">
          <h4>
            <Zap size={16} /> Drip Sequence
          </h4>
          <span className={`drip-badge ${sequence.is_active ? "active" : "paused"}`}>
            {sequence.is_active ? "Active" : "Paused"}
          </span>
        </div>
        <button
          className={`drip-toggle-btn ${sequence.is_active ? "active" : ""}`}
          onClick={handleToggle}
          disabled={saving}
          title={sequence.is_active ? "Pause sequence" : "Activate sequence"}
        >
          {sequence.is_active ? <PowerOff size={14} /> : <Power size={14} />}
          {sequence.is_active ? "Pause" : "Activate"}
        </button>
      </div>

      {/* Stats bar */}
      {stats.total > 0 && (
        <div className="drip-stats">
          <div className="stat-item">
            <Users size={14} />
            <span>{stats.active} active</span>
          </div>
          <div className="stat-item success">
            <CheckCircle2 size={14} />
            <span>{stats.completed} completed</span>
          </div>
          <div className="stat-item warning">
            <XCircle size={14} />
            <span>{stats.cancelled} cancelled</span>
          </div>
        </div>
      )}

      {/* Timeline of steps */}
      <div className="drip-timeline">
        {/* Initial DM indicator */}
        <div className="timeline-node initial">
          <div className="node-dot">
            <MessageSquare size={12} />
          </div>
          <div className="node-content">
            <span className="node-label">Initial DM</span>
            <span className="node-desc">Sent immediately on trigger</span>
          </div>
        </div>

        {steps.map((step, index) => (
          <div key={step.id} className="timeline-node">
            <div className="timeline-connector" />
            <div className="node-dot step">
              <span>{index + 1}</span>
            </div>
            <div className="node-content">
              <div
                className="node-header"
                onClick={() =>
                  setExpandedStep(
                    expandedStep === step.id ? null : step.id
                  )
                }
              >
                <div className="node-info">
                  <span className="node-label">
                    Follow-up {index + 1}
                  </span>
                  <span className="node-delay">
                    <Clock size={12} /> {formatDelay(step.delay_hours)} after
                    {index === 0 ? " initial DM" : ` step ${index}`}
                  </span>
                </div>
                <div className="node-actions">
                  {expandedStep === step.id ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </div>
              </div>

              {expandedStep === step.id && (
                <div className="node-edit">
                  <div className="edit-field">
                    <label>Delay</label>
                    <div className="delay-presets">
                      {DELAY_PRESETS.map((preset) => (
                        <button
                          key={preset.hours}
                          className={`preset-btn ${
                            step.delay_hours === preset.hours ? "active" : ""
                          }`}
                          onClick={() =>
                            handleUpdateStep(step.id, {
                              delay_hours: preset.hours,
                            })
                          }
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="edit-field">
                    <label>Message</label>
                    <textarea
                      defaultValue={step.message_text}
                      rows={3}
                      placeholder="Hey {name}! Just following up..."
                      onBlur={(e) => {
                        if (e.target.value !== step.message_text) {
                          handleUpdateStep(step.id, {
                            message_text: e.target.value,
                          });
                        }
                      }}
                    />
                    <span className="help-text">
                      Use {"{name}"} for recipient&apos;s username, {"{step}"}
                      for step number
                    </span>
                  </div>

                  <button
                    className="delete-step-btn"
                    onClick={() => handleDeleteStep(step.id)}
                    disabled={saving}
                  >
                    <Trash2 size={14} /> Remove Step
                  </button>
                </div>
              )}

              {expandedStep !== step.id && (
                <p className="node-preview">
                  {step.message_text.slice(0, 80)}
                  {step.message_text.length > 80 ? "..." : ""}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add new step */}
      <div className="add-step-form">
        <h5>
          <Plus size={14} /> Add Follow-up Step
        </h5>
        <div className="edit-field">
          <label>Send after</label>
          <div className="delay-presets">
            {DELAY_PRESETS.map((preset) => (
              <button
                key={preset.hours}
                className={`preset-btn ${
                  newStep.delay_hours === preset.hours ? "active" : ""
                }`}
                onClick={() =>
                  setNewStep((prev) => ({
                    ...prev,
                    delay_hours: preset.hours,
                  }))
                }
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="edit-field">
          <label>Message</label>
          <textarea
            value={newStep.message_text}
            onChange={(e) =>
              setNewStep((prev) => ({
                ...prev,
                message_text: e.target.value,
              }))
            }
            rows={3}
            placeholder="Hey {name}! Just checking in — did you get a chance to check out what we shared? 💬"
          />
        </div>

        <button
          className="add-step-btn"
          onClick={handleAddStep}
          disabled={saving || !newStep.message_text.trim()}
        >
          {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
          Add Step {steps.length + 1}
        </button>
      </div>

      <style jsx>{`
        .drip-builder {
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 1rem;
          background: rgba(139, 92, 246, 0.03);
          overflow: hidden;
        }

        /* ── Header ── */
        .drip-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid rgba(139, 92, 246, 0.1);
        }
        .drip-header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .drip-header-left h4 {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.95rem;
          color: #e2e8f0;
        }
        .drip-badge {
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          border-radius: 9999px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .drip-badge.active {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
        }
        .drip-badge.paused {
          background: rgba(234, 179, 8, 0.15);
          color: #eab308;
        }
        .drip-toggle-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.85rem;
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 0.5rem;
          background: transparent;
          color: #94a3b8;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .drip-toggle-btn:hover {
          background: rgba(139, 92, 246, 0.1);
          color: #8b5cf6;
        }
        .drip-toggle-btn.active {
          border-color: rgba(234, 179, 8, 0.4);
          color: #eab308;
        }

        /* ── Stats ── */
        .drip-stats {
          display: flex;
          gap: 1.25rem;
          padding: 0.75rem 1.25rem;
          border-bottom: 1px solid rgba(139, 92, 246, 0.1);
          background: rgba(15, 23, 42, 0.3);
        }
        .stat-item {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.78rem;
          color: #64748b;
        }
        .stat-item.success {
          color: #22c55e;
        }
        .stat-item.warning {
          color: #f97316;
        }

        /* ── Timeline ── */
        .drip-timeline {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .timeline-node {
          position: relative;
          display: flex;
          gap: 0.85rem;
          padding: 0.75rem 0;
        }
        .timeline-node.initial {
          padding-bottom: 0.5rem;
        }
        .timeline-connector {
          position: absolute;
          left: 13px;
          top: -10px;
          width: 2px;
          height: 24px;
          background: linear-gradient(to bottom, rgba(139, 92, 246, 0.4), rgba(139, 92, 246, 0.2));
        }
        .node-dot {
          width: 28px;
          height: 28px;
          min-width: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 700;
          color: white;
          z-index: 1;
        }
        .timeline-node.initial .node-dot {
          background: linear-gradient(135deg, #22c55e, #16a34a);
        }
        .node-dot.step {
          background: linear-gradient(135deg, #8b5cf6, #a855f7);
        }
        .node-content {
          flex: 1;
          min-width: 0;
        }
        .node-label {
          font-weight: 600;
          font-size: 0.85rem;
          color: #e2e8f0;
        }
        .node-desc {
          font-size: 0.75rem;
          color: #64748b;
          display: block;
          margin-top: 0.15rem;
        }
        .node-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          padding: 0.25rem 0;
          border-radius: 0.4rem;
          transition: all 0.15s;
        }
        .node-header:hover {
          background: rgba(139, 92, 246, 0.05);
        }
        .node-info {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .node-delay {
          font-size: 0.75rem;
          color: #8b5cf6;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        .node-actions {
          color: #64748b;
        }
        .node-preview {
          font-size: 0.78rem;
          color: #94a3b8;
          margin: 0.3rem 0 0;
          line-height: 1.4;
        }

        /* ── Edit panel ── */
        .node-edit {
          margin-top: 0.75rem;
          padding: 1rem;
          background: rgba(15, 23, 42, 0.5);
          border-radius: 0.75rem;
          border: 1px solid rgba(139, 92, 246, 0.15);
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .edit-field label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: #94a3b8;
          margin-bottom: 0.4rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .delay-presets {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }
        .preset-btn {
          padding: 0.3rem 0.65rem;
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 0.4rem;
          background: transparent;
          color: #94a3b8;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.15s;
        }
        .preset-btn:hover {
          border-color: rgba(139, 92, 246, 0.4);
          color: #8b5cf6;
        }
        .preset-btn.active {
          background: rgba(139, 92, 246, 0.15);
          border-color: #8b5cf6;
          color: #8b5cf6;
        }
        textarea {
          width: 100%;
          padding: 0.65rem 0.85rem;
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 0.5rem;
          background: rgba(15, 23, 42, 0.6);
          color: #e2e8f0;
          font-size: 0.85rem;
          line-height: 1.5;
          resize: vertical;
          font-family: inherit;
        }
        textarea:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.15);
        }
        .help-text {
          font-size: 0.7rem;
          color: #64748b;
          margin-top: 0.25rem;
          display: block;
        }
        .delete-step-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.75rem;
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 0.4rem;
          background: transparent;
          color: #ef4444;
          font-size: 0.78rem;
          cursor: pointer;
          transition: all 0.2s;
          align-self: flex-start;
        }
        .delete-step-btn:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        /* ── Add step form ── */
        .add-step-form {
          padding: 1.25rem;
          border-top: 1px solid rgba(139, 92, 246, 0.1);
          background: rgba(15, 23, 42, 0.2);
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .add-step-form h5 {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.85rem;
          color: #94a3b8;
        }
        .add-step-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.55rem 1.25rem;
          background: linear-gradient(135deg, #8b5cf6, #a855f7);
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          align-self: flex-start;
        }
        .add-step-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
        }
        .add-step-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
