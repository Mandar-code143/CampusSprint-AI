// Route Search Agent — delegates to the actual algorithm implementations.
// Does NOT duplicate any search logic; it provides structured inputs and outputs.

import type { CampusGraph } from "@/types/campus";
import type { RouteResult } from "@/types/planning";
import { aStarSearch } from "@/algorithms/aStar";
import { greedyBestFirstSearch } from "@/algorithms/greedyBestFirst";

export interface RouteQuery {
  graph: CampusGraph;
  fromId: string;
  toId: string;
}

export interface CompareResult {
  astar: RouteResult;
  greedy: RouteResult;
}

/** Finds the best unblocked route between two nodes using A*. */
export function findRoute(query: RouteQuery): RouteResult {
  return aStarSearch(query.graph, query.fromId, query.toId);
}

/** Runs both route algorithms and returns their results for comparison. */
export function compareRoutes(query: RouteQuery): CompareResult {
  return {
    astar: aStarSearch(query.graph, query.fromId, query.toId),
    greedy: greedyBestFirstSearch(query.graph, query.fromId, query.toId),
  };
}
