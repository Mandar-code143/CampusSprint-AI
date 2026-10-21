// Logic Agent — calls propositional logic functions to evaluate task eligibility.
// It does NOT re-implement the logic; it imports from src/logic/propositionalLogic.ts.

import type { CampusGraph } from "@/types/campus";
import type { CampusTask } from "@/types/tasks";
import { evaluateEligibility, type EligibilityResult } from "@/logic/propositionalLogic";
import { isReachable } from "@/utils/graphUtils";

export interface LogicEligibilityReport {
  taskId: string;
  taskTitle: string;
  eligible: EligibilityResult;
  routeReachable: boolean;
}

/**
 * Evaluates propositional eligibility for every task in the provided list.
 * Also checks graph reachability (BFS on unblocked edges) for each task's location.
 */
export function evaluateAllEligibility(
  graph: CampusGraph,
  tasks: CampusTask[],
  selectedIds: string[],
  startLocationId: string,
  completedIds: string[],
): LogicEligibilityReport[] {
  const completedSet = new Set(completedIds);
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  return selectedIds.map((id) => {
    const task = taskById.get(id);
    if (!task) {
      return {
        taskId: id,
        taskTitle: id,
        eligible: {
          counterOpen: false,
          taskIncomplete: true,
          prerequisitesMet: false,
          eligible: false,
          explanation: "Task ID not found in task list.",
        },
        routeReachable: false,
      };
    }

    const counterOpen = task.available && (nodeById.get(task.locationId)?.open ?? false);
    const taskIncomplete = !task.completed && !completedSet.has(task.id);
    const prerequisitesMet = task.prerequisiteTaskIds.every(
      (pid) => task.completed || completedSet.has(pid) || tasks.find((t) => t.id === pid)?.completed,
    );
    const routeReachable = isReachable(graph, startLocationId, task.locationId);

    const eligible = evaluateEligibility({ counterOpen, taskIncomplete, prerequisitesMet });

    return {
      taskId: id,
      taskTitle: task.title,
      eligible,
      routeReachable,
    };
  });
}
