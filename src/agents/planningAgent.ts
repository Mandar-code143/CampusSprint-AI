// Planning Coordinator — orchestrates the full AI planning pipeline.
// Delegates to specialised modules; does not reimplement any algorithm.

import type { CampusGraph } from "@/types/campus";
import type { CampusTask } from "@/types/tasks";
import type {
  PlanningResult,
  ScheduledTask,
  RouteLeg,
  TimeBreakdown,
  PlanExplanation,
  FeasibilityStatus,
} from "@/types/planning";
import type { AgentState, ReflexPercept } from "@/types/agents";

import { reflexEvaluate } from "./reflexAgent";
import {
  enrichTasksFromState,
  applyCounterConditions,
} from "./modelBasedAgent";
import { evaluateAllEligibility } from "./logicAgent";
import { buildAndValidatePOP } from "@/planning/partialOrderPlanning";
import { forwardStateSpaceSearch } from "@/algorithms/stateSpaceSearch";
import { aStarSearch } from "@/algorithms/aStar";
import { isReachable, nodeName } from "@/utils/graphUtils";

export interface PlannerInput {
  graph: CampusGraph;
  tasks: CampusTask[];
  selectedTaskIds: string[];
  startLocationId: string;
  breakMinutes: number;
  agentState: AgentState;
}

/**
 * Full planning pipeline:
 * 1. Enrich tasks from model-based agent state.
 * 2. Apply reflex-agent condition rules.
 * 3. Evaluate logical eligibility.
 * 4. Validate partial-order dependency graph.
 * 5. Forward state-space search.
 * 6. Build A*-verified route legs.
 * 7. Assemble the final PlanningResult.
 */
export function generatePlan(input: PlannerInput): PlanningResult {
  const { graph, tasks, selectedTaskIds, startLocationId, breakMinutes, agentState } = input;
  const explanations: PlanExplanation[] = [];
  const warnings: string[] = [];

  // --- Step 1: Enrich tasks from agent state and graph conditions ---
  let enrichedTasks = enrichTasksFromState(agentState, tasks);
  enrichedTasks = applyCounterConditions(enrichedTasks, graph);
  const taskById = new Map(enrichedTasks.map((t) => [t.id, t]));

  // --- Step 2: Reflex agent — immediate condition-action screening ---
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const percepts: ReflexPercept[] = selectedTaskIds
    .map((id) => taskById.get(id))
    .filter(Boolean)
    .map((task) => {
      const t = task!;
      const counterOpen = t.available && (nodeById.get(t.locationId)?.open ?? false);
      const routeAvailable = isReachable(graph, startLocationId, t.locationId);
      const estimatedMinutes = t.queueMinutes + t.serviceMinutes;
      return {
        taskId: t.id,
        taskTitle: t.title,
        counterOpen,
        routeAvailable,
        taskCompleted: t.completed,
        remainingMinutes: breakMinutes,
        estimatedMinutes,
      } as ReflexPercept;
    });

  const reflexDecisions = reflexEvaluate(percepts);
  reflexDecisions.forEach((d) => {
    if (d.action !== "proceed") {
      explanations.push({ source: "Reflex Agent [P1]", message: d.message });
    }
    if (d.action === "warn") warnings.push(d.message);
  });

  // --- Step 3: Propositional logic eligibility ---
  const logicReports = evaluateAllEligibility(
    graph,
    enrichedTasks,
    selectedTaskIds,
    startLocationId,
    agentState.completedTaskIds,
  );
  logicReports.forEach((r) => {
    if (!r.eligible.eligible) {
      explanations.push({
        source: "Logic Agent [P7]",
        message: `"${r.taskTitle}": ${r.eligible.explanation}`,
      });
    }
    if (!r.routeReachable) {
      warnings.push(`No unblocked path to "${r.taskTitle}" (${r.eligible.explanation}).`);
    }
  });

  // --- Step 4: Partial-order dependency validation ---
  const popResult = buildAndValidatePOP(enrichedTasks, selectedTaskIds);
  if (!popResult.valid) {
    explanations.push({ source: "POP Planner [P10]", message: popResult.explanation });
    if (popResult.cycles.length > 0) {
      return buildFailResult(
        "none",
        `Dependency cycle detected: ${popResult.cycles[0].join(" → ")}. Planning aborted.`,
        selectedTaskIds,
        explanations,
        warnings,
      );
    }
  } else {
    explanations.push({ source: "POP Planner [P10]", message: popResult.explanation });
  }

  // --- Step 5: Forward state-space search ---
  const searchInput = {
    graph,
    tasks: enrichedTasks,
    selectedTaskIds,
    startLocationId,
    breakMinutes,
  };

  const searchResult = forwardStateSpaceSearch(searchInput);

  searchResult.excludedTasks.forEach((ex) => {
    const task = taskById.get(ex.taskId);
    explanations.push({
      source: "State-Space Planner [P9]",
      message: `"${task?.title ?? ex.taskId}" excluded: ${ex.reason}`,
    });
  });

  if (searchResult.completedTaskIds.length === 0 && !searchResult.goalReached) {
    return buildFailResult(
      "none",
      searchResult.failureReason ?? "No feasible plan found within the time budget.",
      selectedTaskIds,
      explanations,
      warnings,
      {
        expandedStates: searchResult.expandedStates,
        frontierPeak: searchResult.frontierPeak,
        exploredSamples: searchResult.exploredSamples,
      },
    );
  }

  // --- Step 6: Build scheduled task list with A*-verified route legs ---
  const scheduledTasks: ScheduledTask[] = [];
  const routeEdges: { from: string; to: string; minutes: number }[] = [];
  let currentLocation = startLocationId;
  let elapsed = 0;
  let walkingTotal = 0;
  let waitingTotal = 0;
  let serviceTotal = 0;

  // Build a task completion timeline from the actions returned by the planner.
  // Only "complete" actions produce ScheduledTask records; "move" actions are
  // consolidated into route legs attached to the following task.
  interface PendingLeg { path: string[]; minutes: number }
  const pendingLeg: PendingLeg = { path: [startLocationId], minutes: 0 };

  for (const action of searchResult.actions) {
    if (action.type === "move") {
      // Verify with A* and accumulate the leg.
      const route = aStarSearch(graph, action.fromId, action.toId);
      if (route.success) {
        pendingLeg.path = [...pendingLeg.path, ...route.path.slice(1)];
        pendingLeg.minutes += route.costMinutes;
        // Record route edges for map highlighting.
        for (let i = 0; i < route.path.length - 1; i++) {
          routeEdges.push({ from: route.path[i], to: route.path[i + 1], minutes: 0 });
        }
      }
      elapsed += action.minutes;
      walkingTotal += action.minutes;
      currentLocation = action.toId;
    } else {
      const task = taskById.get(action.taskId);
      if (!task) continue;
      const arrivalMinute = elapsed - action.minutes;
      const thisLeg: RouteLeg = {
        fromId: pendingLeg.path[0],
        toId: currentLocation,
        path: [...pendingLeg.path],
        travelMinutes: pendingLeg.minutes,
      };
      pendingLeg.path = [currentLocation];
      pendingLeg.minutes = 0;

      const serviceStartMinute = arrivalMinute + action.queueMinutes;
      const completionMinute = serviceStartMinute + action.serviceMinutes;
      const deadlineMet = task.deadlineMinute === null || completionMinute <= task.deadlineMinute;
      const prereqsMet = task.prerequisiteTaskIds.every((pid) =>
        searchResult.completedTaskIds.includes(pid) || agentState.completedTaskIds.includes(pid),
      );

      scheduledTasks.push({
        taskId: task.id,
        order: scheduledTasks.length + 1,
        locationId: task.locationId,
        leg: thisLeg,
        arrivalMinute,
        queueMinutes: action.queueMinutes,
        serviceStartMinute,
        serviceMinutes: action.serviceMinutes,
        completionMinute,
        deadlineMinute: task.deadlineMinute,
        deadlineMet,
        prerequisitesSatisfied: prereqsMet,
      });

      waitingTotal += action.queueMinutes;
      serviceTotal += action.serviceMinutes;

      if (!deadlineMet) {
        warnings.push(
          `"${task.title}" completes at minute ${completionMinute} past its deadline of minute ${task.deadlineMinute}.`,
        );
      }
    }
  }

  const totalElapsed = searchResult.elapsedMinutes;
  const remaining = Math.max(0, breakMinutes - totalElapsed);
  const utilPct = Math.min(100, Math.round((totalElapsed / breakMinutes) * 100));

  const breakdown: TimeBreakdown = {
    walkingMinutes: Math.round(walkingTotal * 10) / 10,
    serviceMinutes: Math.round(serviceTotal * 10) / 10,
    waitingMinutes: Math.round(waitingTotal * 10) / 10,
    totalElapsedMinutes: Math.round(totalElapsed * 10) / 10,
    remainingMinutes: Math.round(remaining * 10) / 10,
    budgetUtilizationPercent: utilPct,
  };

  const status: FeasibilityStatus = searchResult.goalReached
    ? "feasible"
    : scheduledTasks.length > 0
      ? "partial"
      : "none";

  if (status === "feasible") {
    explanations.push({
      source: "Planning Coordinator",
      message: `Full plan found: ${scheduledTasks.length} task(s) complete within ${breakMinutes} min.`,
    });
  } else if (status === "partial") {
    explanations.push({
      source: "Planning Coordinator",
      message: `Partial plan: ${scheduledTasks.length} task(s) fit the budget; ${searchResult.excludedTasks.length} could not be placed.`,
    });
  }

  const unplacedTasks = searchResult.excludedTasks.filter(
    (ex) => !searchResult.completedTaskIds.includes(ex.taskId),
  );

  return {
    status,
    scheduledTasks,
    unplacedTasks,
    breakdown,
    warnings,
    explanations,
    searchStats: {
      expandedStates: searchResult.expandedStates,
      frontierPeak: searchResult.frontierPeak,
      exploredSamples: searchResult.exploredSamples,
    },
    routeEdges,
    taskOrderNodeIds: scheduledTasks.map((s) => s.locationId),
    infeasibilityReason:
      status === "none" ? (searchResult.failureReason ?? "No feasible plan found.") : null,
  };
}

function buildFailResult(
  status: FeasibilityStatus,
  reason: string,
  selectedTaskIds: string[],
  explanations: PlanExplanation[],
  warnings: string[],
  searchStats?: {
    expandedStates: number;
    frontierPeak: number;
    exploredSamples: { locationId: string; completedTaskIds: string[]; elapsedMinutes: number; priority: number }[];
  },
): PlanningResult {
  return {
    status,
    scheduledTasks: [],
    unplacedTasks: selectedTaskIds.map((id) => ({ taskId: id, reason })),
    breakdown: {
      walkingMinutes: 0,
      serviceMinutes: 0,
      waitingMinutes: 0,
      totalElapsedMinutes: 0,
      remainingMinutes: 0,
      budgetUtilizationPercent: 0,
    },
    warnings,
    explanations,
    searchStats: searchStats ?? { expandedStates: 0, frontierPeak: 0, exploredSamples: [] },
    routeEdges: [],
    taskOrderNodeIds: [],
    infeasibilityReason: reason,
  };
}

export { nodeName };
