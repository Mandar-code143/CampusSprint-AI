// Dashboard section — project overview, stats, AI workflow, and session events.
import {
  LayoutDashboard,
  Clock,
  CheckSquare,
  Route,
  Zap,
  AlertCircle,
  ArrowRight,
  Brain,
  Eye,
  Database,
  Cpu,
  Search,
  Shield,
  ThumbsUp,
} from "lucide-react";
import { useApp } from "@/store/appStore";
import { formatDuration } from "@/utils/timeUtils";

const WORKFLOW_STEPS = [
  { icon: Eye, label: "Observe", desc: "Reflex Agent reads current campus conditions and task percepts." },
  { icon: Database, label: "Remember", desc: "Model-Based Agent updates its internal state model from observations." },
  { icon: Brain, label: "Infer", desc: "Logic Agent evaluates E = C ∧ I ∧ P for each candidate task." },
  { icon: Route, label: "Plan", desc: "POP Planner validates prerequisite ordering and detects dependency cycles." },
  { icon: Search, label: "Search", desc: "State-Space Planner (A*) explores movement and completion action sequences." },
  { icon: Shield, label: "Validate", desc: "CSP/Min-Conflicts checks time, deadline, and constraint satisfaction." },
  { icon: ThumbsUp, label: "Recommend", desc: "Planning Coordinator assembles the final route and justification." },
];

export function DashboardSection() {
  const { state, dispatch } = useApp();
  const { latestPlan, tasks, selectedTaskIds, breakMinutes, agentState } = state;

  const completedCount = tasks.filter((t) => t.completed).length;
  const plannedCount = latestPlan?.scheduledTasks.length ?? 0;
  const travelTime = latestPlan?.breakdown.walkingMinutes ?? null;
  const feasibility = latestPlan?.status ?? null;

  const events = agentState.events.slice().reverse().slice(0, 6);

  return (
    <div className="cs-section">
      {/* Header */}
      <div className="cs-section-header">
        <div className="cs-section-title-row">
          <LayoutDashboard size={20} className="cs-section-icon" />
          <h1 className="cs-section-title">Dashboard</h1>
        </div>
        <p className="cs-section-sub">
          CampusSprint AI helps you plan the optimal sequence of campus errands during a limited break,
          using symbolic AI search, intelligent agents, and constraint-based scheduling.
        </p>
      </div>

      {/* Stats row */}
      <div className="cs-stats-grid">
        <div className="cs-stat-card">
          <div className="cs-stat-label">
            <Clock size={14} /> Break Duration
          </div>
          <div className="cs-stat-value">{formatDuration(breakMinutes)}</div>
        </div>
        <div className="cs-stat-card">
          <div className="cs-stat-label">
            <CheckSquare size={14} /> Selected Tasks
          </div>
          <div className="cs-stat-value">{selectedTaskIds.length}</div>
        </div>
        <div className="cs-stat-card">
          <div className="cs-stat-label">
            <Route size={14} /> Travel Time
          </div>
          <div className="cs-stat-value">
            {travelTime !== null ? formatDuration(travelTime) : "—"}
          </div>
        </div>
        <div className="cs-stat-card">
          <div className="cs-stat-label">
            <Zap size={14} /> Tasks Planned
          </div>
          <div className="cs-stat-value">{plannedCount > 0 ? plannedCount : completedCount > 0 ? `${completedCount} done` : "—"}</div>
        </div>
      </div>

      {/* Feasibility banner */}
      {feasibility && (
        <div className={`cs-feasibility-banner cs-feasibility--${feasibility}`}>
          {feasibility === "feasible" && (
            <>✓ Full plan — all selected tasks fit the {breakMinutes}-minute break.</>
          )}
          {feasibility === "partial" && (
            <>⚠ Partial plan — {plannedCount} of {selectedTaskIds.length} tasks can be completed.</>
          )}
          {feasibility === "none" && (
            <><AlertCircle size={14} /> No feasible plan — check task settings or boundary conditions.</>
          )}
        </div>
      )}

      {/* Create plan CTA */}
      {!latestPlan && (
        <div className="cs-cta-card">
          <div className="cs-cta-text">
            <h2 className="cs-cta-heading">Ready to plan your break?</h2>
            <p className="cs-cta-body">
              Select tasks and generate an AI-optimised errand sequence. The planner will find the best
              route, check constraints, and explain every decision.
            </p>
          </div>
          <button
            id="btn-go-to-planner"
            className="cs-btn cs-btn--primary"
            onClick={() => dispatch({ type: "SET_SECTION", section: "planner" })}
          >
            Create My Plan <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* AI workflow */}
      <div className="cs-card">
        <h2 className="cs-card-heading">AI Planning Workflow</h2>
        <div className="cs-workflow">
          {WORKFLOW_STEPS.map((step, i) => (
            <div key={step.label} className="cs-workflow-step">
              <div className="cs-workflow-icon">
                <step.icon size={16} />
              </div>
              <div className="cs-workflow-label">{step.label}</div>
              <div className="cs-workflow-desc">{step.desc}</div>
              {i < WORKFLOW_STEPS.length - 1 && (
                <div className="cs-workflow-arrow"><ArrowRight size={12} /></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Session events */}
      <div className="cs-card">
        <h2 className="cs-card-heading">Session Events</h2>
        {events.length === 0 ? (
          <div className="cs-empty-state">No events yet. Generate a plan to see agent activity.</div>
        ) : (
          <ul className="cs-event-list">
            {events.map((ev) => (
              <li key={ev.id} className={`cs-event cs-event--${ev.kind}`}>
                <span className="cs-event-kind">{ev.kind}</span>
                <span className="cs-event-msg">{ev.message}</span>
                <span className="cs-event-time">{new Date(ev.timestamp).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
