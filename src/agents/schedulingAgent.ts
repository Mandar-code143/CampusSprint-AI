// Scheduling Agent — delegates to the CSP/Min-Conflicts implementation.
// Validates the resulting assignment and explains any unresolved constraint violations.

import type { MinConflictsResult } from "@/types/planning";
import type { CampusGraph } from "@/types/campus";
import type { CampusTask } from "@/types/tasks";
import { minConflictsSchedule } from "@/algorithms/minConflictsScheduler";

export interface SchedulingQuery {
  graph: CampusGraph;
  tasks: CampusTask[];
  selectedTaskIds: string[];
  breakMinutes: number;
}

export interface SchedulingReport {
  result: MinConflictsResult;
  summary: string;
  valid: boolean;
}

/** Runs Min-Conflicts and produces a structured scheduling report. */
export function scheduleWithCSP(query: SchedulingQuery): SchedulingReport {
  const result = minConflictsSchedule({
    graph: query.graph,
    tasks: query.tasks,
    selectedTaskIds: query.selectedTaskIds,
    breakMinutes: query.breakMinutes,
  });

  const valid = result.success && result.conflictsAfter === 0;
  let summary: string;

  if (result.order.length === 0) {
    summary = "No tasks selected for scheduling.";
  } else if (valid) {
    summary = `Valid schedule found in ${result.iterations} iteration(s) across ${result.restarts} restart(s). Total time: ${result.scheduleTotalMinutes} min.`;
  } else {
    summary = `Best-effort schedule produced after ${result.iterations} iteration(s) with ${result.conflictsAfter} remaining conflict(s). Constraint satisfaction was not fully achieved.`;
  }

  return { result, summary, valid };
}
