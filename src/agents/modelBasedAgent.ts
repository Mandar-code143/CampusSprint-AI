// [P2 — MODEL-BASED REFLEX AGENT] Maintains an internal state model across observations and actions.
// Unlike the simple reflex agent, this agent remembers previous observations, completed tasks,
// counter conditions, and queue estimates in order to make more informed decisions.

import type { AgentState, SessionEvent } from "@/types/agents";
import type { CampusGraph } from "@/types/campus";
import type { CampusTask } from "@/types/tasks";
import type { PlanningResult } from "@/types/planning";

/** Creates a fresh agent state from the default campus data. */
export function initAgentState(startLocationId: string): AgentState {
  return {
    currentLocationId: startLocationId,
    completedTaskIds: [],
    queueObservations: {},
    latestPlan: null,
    events: [],
  };
}

function makeEvent(
  kind: SessionEvent["kind"],
  message: string,
): SessionEvent {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    kind,
    message,
  };
}

/** Returns a new state with the agent moved to a new location. */
export function observeLocation(
  state: AgentState,
  locationId: string,
  locationName: string,
): AgentState {
  const event = makeEvent(
    "condition",
    `Agent observed location change: now at "${locationName}".`,
  );
  return {
    ...state,
    currentLocationId: locationId,
    events: [...state.events.slice(-19), event],
  };
}

/** Returns a new state after a task has been marked completed. */
export function recordTaskCompleted(
  state: AgentState,
  taskId: string,
  taskTitle: string,
): AgentState {
  if (state.completedTaskIds.includes(taskId)) return state;
  const event = makeEvent("task", `Completed: "${taskTitle}".`);
  return {
    ...state,
    completedTaskIds: [...state.completedTaskIds, taskId],
    events: [...state.events.slice(-19), event],
  };
}

/** Updates estimated queue time for a task from a live observation. */
export function updateQueueObservation(
  state: AgentState,
  taskId: string,
  taskTitle: string,
  observedMinutes: number,
): AgentState {
  const event = makeEvent(
    "condition",
    `Queue update for "${taskTitle}": observed ${observedMinutes} min wait.`,
  );
  return {
    ...state,
    queueObservations: { ...state.queueObservations, [taskId]: observedMinutes },
    events: [...state.events.slice(-19), event],
  };
}

/**
 * Applies all task completion statuses from the tasks array to the agent state.
 * Useful for synchronising the agent after external changes (e.g. Reset Demo).
 */
export function syncCompletedTasks(
  state: AgentState,
  tasks: CampusTask[],
): AgentState {
  const doneIds = tasks.filter((t) => t.completed).map((t) => t.id);
  return { ...state, completedTaskIds: doneIds };
}

/** Records the latest planning result into the agent's internal model. */
export function storePlanResult(
  state: AgentState,
  plan: PlanningResult,
): AgentState {
  const feasText =
    plan.status === "feasible"
      ? "feasible"
      : plan.status === "partial"
        ? "partial"
        : "infeasible";
  const event = makeEvent("plan", `New plan generated: ${feasText}, ${plan.scheduledTasks.length} task(s) scheduled.`);
  return {
    ...state,
    latestPlan: plan,
    events: [...state.events.slice(-19), event],
  };
}

/** Records a scenario change event in the agent's history. */
export function recordScenario(
  state: AgentState,
  description: string,
): AgentState {
  const event = makeEvent("scenario", description);
  return {
    ...state,
    events: [...state.events.slice(-19), event],
  };
}

/**
 * Returns task durations as known by the model, preferring Queue observations
 * over default task values when a live observation is available.
 */
export function effectiveQueueMinutes(
  state: AgentState,
  task: CampusTask,
): number {
  return state.queueObservations[task.id] ?? task.queueMinutes;
}

/**
 * Builds an enriched task list that incorporates queue observations stored
 * in the agent's internal model. All other fields remain as configured.
 */
export function enrichTasksFromState(
  state: AgentState,
  tasks: CampusTask[],
): CampusTask[] {
  return tasks.map((t) => ({
    ...t,
    completed: t.completed || state.completedTaskIds.includes(t.id),
    queueMinutes: effectiveQueueMinutes(state, t),
  }));
}

/**
 * Applies in-place counter-availability information from the live graph to
 * the tasks, so the model always reflects the current campus conditions.
 */
export function applyCounterConditions(
  tasks: CampusTask[],
  graph: CampusGraph,
): CampusTask[] {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  return tasks.map((t) => ({
    ...t,
    available: t.available && (nodeById.get(t.locationId)?.open ?? false),
  }));
}
