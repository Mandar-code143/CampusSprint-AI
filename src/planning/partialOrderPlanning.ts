// [P10 — PARTIAL-ORDER PLANNING] Enforces required precedence without imposing unnecessary
// order on independent tasks. Validates dependency graphs and detects cycles.

import type { CampusTask } from "@/types/tasks";

export interface DependencyEdge {
  from: string; // prerequisite task id
  to: string;   // dependent task id
}

export interface POPResult {
  valid: boolean;
  topologicalOrder: string[] | null;
  independentGroups: string[][];
  cycles: string[][];
  missingPrereqs: { taskId: string; missingId: string }[];
  explanation: string;
  edges: DependencyEdge[];
}

/**
 * Builds and validates the partial-order dependency graph for the selected tasks.
 * Detects cycles, missing prerequisite references, and produces a topological order
 * (or independent groups) when the graph is acyclic.
 */
export function buildAndValidatePOP(
  tasks: CampusTask[],
  selectedIds: string[],
): POPResult {
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const selectedSet = new Set(selectedIds);
  const selected = selectedIds.map((id) => taskById.get(id)).filter(Boolean) as CampusTask[];

  const edges: DependencyEdge[] = [];
  const missingPrereqs: { taskId: string; missingId: string }[] = [];

  for (const task of selected) {
    for (const prereqId of task.prerequisiteTaskIds) {
      const prereq = taskById.get(prereqId);
      if (!prereq) {
        missingPrereqs.push({ taskId: task.id, missingId: prereqId });
        continue;
      }
      // Only add edges between selected tasks; completed prereqs are already satisfied.
      if (selectedSet.has(prereqId) && !prereq.completed) {
        edges.push({ from: prereqId, to: task.id });
      }
    }
  }

  // Topological sort using Kahn's algorithm (BFS-based).
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();
  for (const id of selectedIds) {
    inDegree.set(id, 0);
    adjList.set(id, []);
  }
  for (const edge of edges) {
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    adjList.get(edge.from)?.push(edge.to);
  }

  const queue: string[] = [];
  inDegree.forEach((deg, id) => {
    if (deg === 0) queue.push(id);
  });
  queue.sort(); // deterministic

  const topologicalOrder: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    topologicalOrder.push(node);
    for (const neighbor of adjList.get(node) ?? []) {
      const deg = (inDegree.get(neighbor) ?? 0) - 1;
      inDegree.set(neighbor, deg);
      if (deg === 0) queue.push(neighbor);
    }
    queue.sort(); // stable sort keeps output deterministic
  }

  // Detect cycles: any nodes not in topological order are part of a cycle.
  const cycles: string[][] = [];
  if (topologicalOrder.length < selectedIds.length) {
    const cycleNodes = selectedIds.filter((id) => !topologicalOrder.includes(id));
    // Simple SCC-style grouping — report as one cycle group for the demo.
    cycles.push(cycleNodes);
  }

  const valid = cycles.length === 0 && missingPrereqs.length === 0;

  // Identify independent groups: tasks with no edges between them.
  const independentGroups: string[][] = [];
  if (valid) {
    const hasEdge = new Set(edges.flatMap((e) => [e.from, e.to]));
    const independent = selectedIds.filter((id) => !hasEdge.has(id));
    if (independent.length > 0) independentGroups.push(independent);
  }

  let explanation: string;
  if (!valid) {
    const parts: string[] = [];
    if (cycles.length > 0)
      parts.push(`Cycle detected among tasks: [${cycles[0].join(" → ")} → (back)].`);
    if (missingPrereqs.length > 0)
      parts.push(
        `Missing prerequisite references: ${missingPrereqs.map((m) => `"${m.missingId}" required by "${m.taskId}"`).join(", ")}.`,
      );
    explanation = parts.join(" ");
  } else if (edges.length === 0) {
    explanation = "No dependency edges among selected tasks — all tasks are mutually independent.";
  } else {
    const ordered = topologicalOrder
      .map((id) => taskById.get(id)?.title ?? id)
      .join(" → ");
    explanation = `Valid dependency graph. Topological order: ${ordered}.`;
  }

  return {
    valid,
    topologicalOrder: valid ? topologicalOrder : null,
    independentGroups,
    cycles,
    missingPrereqs,
    explanation,
    edges,
  };
}

/**
 * Returns a simple list of prerequisite explanations for display.
 * Only for selected tasks; tasks that are already completed are noted but not
 * required to be re-completed.
 */
export function describeDependencies(
  tasks: CampusTask[],
  selectedIds: string[],
): string[] {
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const lines: string[] = [];
  for (const id of selectedIds) {
    const task = taskById.get(id);
    if (!task || task.prerequisiteTaskIds.length === 0) continue;
    const names = task.prerequisiteTaskIds.map(
      (pid) => taskById.get(pid)?.title ?? pid,
    );
    lines.push(`"${task.title}" requires: ${names.join(", ")}.`);
  }
  if (lines.length === 0) lines.push("No prerequisite dependencies among selected tasks.");
  return lines;
}
