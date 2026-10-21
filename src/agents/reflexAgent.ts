// [P1 — SIMPLE REFLEX AGENT] Decision is based on current percepts and condition-action rules.
// This agent has NO memory of past observations. It evaluates each task purely from the
// current percept snapshot and fires the first matching condition-action rule.

import type { ReflexPercept, ReflexDecision } from "@/types/agents";

/**
 * Applies explicit condition-action rules to a single percept.
 * Rules are evaluated in priority order; the first match determines the action.
 */
export function applyReflexRules(percept: ReflexPercept): ReflexDecision {
  // Rule 1: Task already complete — never recommend repeating it.
  if (percept.taskCompleted) {
    return {
      taskId: percept.taskId,
      rule: "R1: task already complete",
      action: "skip",
      message: `"${percept.taskTitle}" is already completed. Skipping.`,
    };
  }

  // Rule 2: Counter is closed — the task cannot be served regardless of routing.
  if (!percept.counterOpen) {
    return {
      taskId: percept.taskId,
      rule: "R2: counter closed",
      action: "ineligible",
      message: `"${percept.taskTitle}" is ineligible — the required counter is currently closed.`,
    };
  }

  // Rule 3: Route to the task location is blocked.
  if (!percept.routeAvailable) {
    return {
      taskId: percept.taskId,
      rule: "R3: no available route",
      action: "ineligible",
      message: `"${percept.taskTitle}" is ineligible — no unblocked walking route reaches the destination.`,
    };
  }

  // Rule 4: Remaining time is less than the minimum estimated task duration.
  if (percept.remainingMinutes < percept.estimatedMinutes) {
    return {
      taskId: percept.taskId,
      rule: "R4: insufficient remaining time",
      action: "warn",
      message: `"${percept.taskTitle}" may not fit — only ${percept.remainingMinutes} min remain, estimated ${percept.estimatedMinutes} min needed.`,
    };
  }

  // Default rule: all conditions satisfied, proceed.
  return {
    taskId: percept.taskId,
    rule: "R5: all conditions satisfied",
    action: "proceed",
    message: `"${percept.taskTitle}" is eligible and the route is open. Recommended for planning.`,
  };
}

/**
 * Evaluates a batch of percepts and returns one ReflexDecision per task.
 * The agent does not store or compare across calls — each call is stateless.
 */
export function reflexEvaluate(percepts: ReflexPercept[]): ReflexDecision[] {
  return percepts.map(applyReflexRules);
}
