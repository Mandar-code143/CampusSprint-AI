// Planner section — task selection, break settings, and plan output.
import { useState, useCallback } from "react";
import {
  Route,
  Clock,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Info,
  Minus,
  Plus,
} from "lucide-react";
import { useApp } from "@/store/appStore";
import { generatePlan } from "@/agents/planningAgent";
import { storePlanResult } from "@/agents/modelBasedAgent";
import { formatDuration, formatMinute } from "@/utils/timeUtils";
import type { PlanningResult } from "@/types/planning";

export function PlannerSection() {
  const { state, dispatch } = useApp();
  const { graph, tasks, selectedTaskIds, startLocationId, breakMinutes, agentState, latestPlan } = state;
  const [isPlanning, setIsPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const availableTaskIds = tasks.filter((t) => !t.completed).map((t) => t.id);
  const completedTasks = tasks.filter((t) => t.completed);

  const handleToggleTask = (id: string) => {
    dispatch({ type: "TOGGLE_TASK", taskId: id });
  };

  const handleGeneratePlan = useCallback(() => {
    if (selectedTaskIds.length === 0) {
      setPlanError("Please select at least one task before generating a plan.");
      return;
    }
    setPlanError(null);
    setIsPlanning(true);
    // Use setTimeout to avoid blocking the render.
    setTimeout(() => {
      try {
        const plan = generatePlan({
          graph,
          tasks,
          selectedTaskIds,
          startLocationId,
          breakMinutes,
          agentState,
        });
        const newAgentState = storePlanResult(agentState, plan);
        dispatch({ type: "SET_PLAN", plan, newAgentState });
      } catch (e) {
        setPlanError(e instanceof Error ? e.message : "Planning failed. Check task configuration.");
      } finally {
        setIsPlanning(false);
      }
    }, 0);
  }, [graph, tasks, selectedTaskIds, startLocationId, breakMinutes, agentState, dispatch]);

  const handleBreakChange = (delta: number) => {
    dispatch({ type: "SET_BREAK", minutes: Math.max(5, Math.min(120, breakMinutes + delta)) });
  };

  return (
    <div className="cs-section">
      <div className="cs-section-header">
        <div className="cs-section-title-row">
          <Route size={20} className="cs-section-icon" />
          <h1 className="cs-section-title">Plan My Break</h1>
        </div>
        <p className="cs-section-sub">
          Select your errands, set the break duration, and let the AI find the best sequence.
        </p>
      </div>

      <div className="cs-planner-layout">
        {/* Left: inputs */}
        <div className="cs-planner-inputs">
          {/* Break duration */}
          <div className="cs-card">
            <h2 className="cs-card-heading"><Clock size={14} /> Break Duration</h2>
            <div className="cs-break-control">
              <button id="btn-break-minus" className="cs-icon-btn" onClick={() => handleBreakChange(-5)}>
                <Minus size={14} />
              </button>
              <span className="cs-break-value">{breakMinutes} min</span>
              <button id="btn-break-plus" className="cs-icon-btn" onClick={() => handleBreakChange(5)}>
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Starting location */}
          <div className="cs-card">
            <h2 className="cs-card-heading">Starting Location</h2>
            <select
              id="select-start-location"
              className="cs-select"
              value={startLocationId}
              onChange={(e) => dispatch({ type: "SET_START", locationId: e.target.value })}
            >
              {graph.nodes.map((n) => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>

          {/* Task selection */}
          <div className="cs-card">
            <h2 className="cs-card-heading">Select Tasks</h2>
            <div className="cs-task-list">
              {tasks.filter((t) => !t.completed).map((task) => {
                const selected = selectedTaskIds.includes(task.id);
                const node = graph.nodes.find((n) => n.id === task.locationId);
                const available = task.available && (node?.open ?? false);
                return (
                  <label
                    key={task.id}
                    className={`cs-task-item ${selected ? "cs-task-item--selected" : ""} ${!available ? "cs-task-item--unavailable" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="cs-task-check"
                      checked={selected}
                      onChange={() => handleToggleTask(task.id)}
                    />
                    <div className="cs-task-info">
                      <div className="cs-task-title">
                        {task.title}
                        <span className={`cs-priority cs-priority--${task.priority}`}>{task.priority}</span>
                        {!available && <span className="cs-badge cs-badge--warn">Unavailable</span>}
                      </div>
                      <div className="cs-task-meta">
                        {node?.name ?? task.locationId} · {task.queueMinutes + task.serviceMinutes} min
                        {task.prerequisiteTaskIds.length > 0 && (
                          <span className="cs-prereq-tag">
                            needs: {task.prerequisiteTaskIds.map(pid => tasks.find(t => t.id === pid)?.title ?? pid).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      className="cs-mark-done-btn"
                      title="Mark complete"
                      onClick={(e) => { e.preventDefault(); dispatch({ type: "MARK_COMPLETE", taskId: task.id }); }}
                    >
                      <CheckCircle2 size={14} />
                    </button>
                  </label>
                );
              })}
              {completedTasks.length > 0 && (
                <div className="cs-completed-tasks">
                  <div className="cs-completed-label">Already completed:</div>
                  {completedTasks.map((t) => (
                    <div key={t.id} className="cs-completed-task">
                      <CheckCircle2 size={12} className="cs-check-icon" /> {t.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {planError && (
            <div className="cs-alert cs-alert--error">
              <AlertTriangle size={14} /> {planError}
            </div>
          )}

          <button
            id="btn-generate-plan"
            className="cs-btn cs-btn--primary cs-btn--full"
            disabled={isPlanning || selectedTaskIds.length === 0}
            onClick={handleGeneratePlan}
          >
            {isPlanning ? (
              <><span className="cs-spinner" /> Generating Plan…</>
            ) : (
              <><Play size={14} /> Generate AI Plan</>
            )}
          </button>
        </div>

        {/* Right: plan results */}
        <div className="cs-planner-results">
          {latestPlan ? (
            <PlanDisplay plan={latestPlan} tasks={tasks} graph={graph} breakMinutes={breakMinutes} />
          ) : (
            <div className="cs-empty-card">
              <Route size={40} className="cs-empty-icon" />
              <p className="cs-empty-text">Your plan will appear here after you click <strong>Generate AI Plan</strong>.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlanDisplay({
  plan,
  tasks,
  graph: campusGraph,
  breakMinutes,
}: {
  plan: PlanningResult;
  tasks: import("@/types/tasks").CampusTask[];
  graph: import("@/types/campus").CampusGraph;
  breakMinutes: number;
}) {
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const nodeById = new Map(campusGraph.nodes.map((n) => [n.id, n]));
  const [showExplanations, setShowExplanations] = useState(false);

  return (
    <div className="cs-plan-display">
      {/* Status */}
      <div className={`cs-plan-status cs-plan-status--${plan.status}`}>
        {plan.status === "feasible" && <><CheckCircle2 size={16} /> All Selected Tasks Feasible</>}
        {plan.status === "partial" && <><AlertTriangle size={16} /> Partial Plan — Best Achievable Subset</>}
        {plan.status === "none" && <><XCircle size={16} /> No Feasible Plan Found</>}
      </div>

      {plan.infeasibilityReason && (
        <div className="cs-alert cs-alert--error">{plan.infeasibilityReason}</div>
      )}

      {/* Time breakdown */}
      <div className="cs-card">
        <h2 className="cs-card-heading">Time Breakdown</h2>
        <div className="cs-breakdown-grid">
          <div className="cs-breakdown-item">
            <span className="cs-breakdown-label">Walking</span>
            <span className="cs-breakdown-val">{formatDuration(plan.breakdown.walkingMinutes)}</span>
          </div>
          <div className="cs-breakdown-item">
            <span className="cs-breakdown-label">Queuing</span>
            <span className="cs-breakdown-val">{formatDuration(plan.breakdown.waitingMinutes)}</span>
          </div>
          <div className="cs-breakdown-item">
            <span className="cs-breakdown-label">Service</span>
            <span className="cs-breakdown-val">{formatDuration(plan.breakdown.serviceMinutes)}</span>
          </div>
          <div className="cs-breakdown-item">
            <span className="cs-breakdown-label">Total Used</span>
            <span className="cs-breakdown-val cs-breakdown-val--total">{formatDuration(plan.breakdown.totalElapsedMinutes)}</span>
          </div>
          <div className="cs-breakdown-item">
            <span className="cs-breakdown-label">Remaining</span>
            <span className="cs-breakdown-val">{formatDuration(plan.breakdown.remainingMinutes)}</span>
          </div>
          <div className="cs-breakdown-item">
            <span className="cs-breakdown-label">Utilisation</span>
            <span className="cs-breakdown-val">{plan.breakdown.budgetUtilizationPercent}%</span>
          </div>
        </div>
        {/* Budget bar */}
        <div className="cs-budget-bar-wrap">
          <div className="cs-budget-bar" style={{ width: `${plan.breakdown.budgetUtilizationPercent}%` }} />
        </div>
      </div>

      {/* Scheduled tasks */}
      {plan.scheduledTasks.length > 0 && (
        <div className="cs-card">
          <h2 className="cs-card-heading">Recommended Schedule</h2>
          <div className="cs-schedule-list">
            {plan.scheduledTasks.map((st, i) => {
              const task = taskById.get(st.taskId);
              const loc = nodeById.get(st.locationId);
              return (
                <div key={st.taskId} className="cs-schedule-item">
                  <div className="cs-schedule-order">{i + 1}</div>
                  <div className="cs-schedule-body">
                    <div className="cs-schedule-title">{task?.title ?? st.taskId}</div>
                    <div className="cs-schedule-meta">
                      {loc?.name ?? st.locationId} · Arrive {formatMinute(st.arrivalMinute)} · Done {formatMinute(st.completionMinute)}
                      {st.leg.travelMinutes > 0 && ` · Walk ${formatDuration(st.leg.travelMinutes)}`}
                    </div>
                    {!st.deadlineMet && (
                      <div className="cs-schedule-warn">⚠ Deadline exceeded</div>
                    )}
                    {!st.prerequisitesSatisfied && (
                      <div className="cs-schedule-warn">⚠ Prerequisites not met</div>
                    )}
                  </div>
                  <ChevronRight size={14} className="cs-schedule-arrow" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unplaced tasks */}
      {plan.unplacedTasks.length > 0 && (
        <div className="cs-card">
          <h2 className="cs-card-heading">Tasks Not Planned</h2>
          {plan.unplacedTasks.map((u) => {
            const task = taskById.get(u.taskId);
            return (
              <div key={u.taskId} className="cs-unplaced-item">
                <XCircle size={13} className="cs-unplaced-icon" />
                <div>
                  <div className="cs-unplaced-title">{task?.title ?? u.taskId}</div>
                  <div className="cs-unplaced-reason">{u.reason}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Warnings */}
      {plan.warnings.length > 0 && (
        <div className="cs-card">
          <h2 className="cs-card-heading">Warnings</h2>
          {plan.warnings.map((w, i) => (
            <div key={i} className="cs-alert cs-alert--warn">{w}</div>
          ))}
        </div>
      )}

      {/* Search stats */}
      <div className="cs-card">
        <h2 className="cs-card-heading">Search Statistics</h2>
        <div className="cs-stats-mini">
          <div><span className="cs-stat-mini-label">States Expanded</span><span>{plan.searchStats.expandedStates}</span></div>
          <div><span className="cs-stat-mini-label">Frontier Peak</span><span>{plan.searchStats.frontierPeak}</span></div>
        </div>
        {plan.searchStats.exploredSamples.length > 0 && (
          <details className="cs-details">
            <summary>Show explored state samples ({plan.searchStats.exploredSamples.length})</summary>
            <div className="cs-samples">
              {plan.searchStats.exploredSamples.map((s, i) => (
                <div key={i} className="cs-sample-row">
                  <span>{campusGraph.nodes.find(n => n.id === s.locationId)?.name ?? s.locationId}</span>
                  <span>{s.completedTaskIds.length} done</span>
                  <span>{s.elapsedMinutes.toFixed(1)} min</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Agent explanations */}
      <div className="cs-card">
        <button
          className="cs-toggle-btn"
          onClick={() => setShowExplanations(!showExplanations)}
        >
          <Info size={14} /> {showExplanations ? "Hide" : "Show"} Agent Explanations ({plan.explanations.length})
        </button>
        {showExplanations && (
          <div className="cs-explanations">
            {plan.explanations.map((ex, i) => (
              <div key={i} className="cs-explanation">
                <span className="cs-explanation-source">{ex.source}</span>
                <span className="cs-explanation-msg">{ex.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
