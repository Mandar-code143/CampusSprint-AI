// Central application store using React context + useReducer.
// Persists relevant state to localStorage and provides Reset Demo.

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

import type { CampusGraph } from "@/types/campus";
import type { CampusTask } from "@/types/tasks";
import type { PlanningResult } from "@/types/planning";
import type { AgentState } from "@/types/agents";

import { cloneSampleGraph } from "@/data/sampleCampus";
import { cloneSampleTasks } from "@/data/sampleTasks";
import { initAgentState, recordScenario } from "@/agents/modelBasedAgent";

const STORAGE_KEY = "campussprint_v1";
const DEFAULT_BREAK = 30;
const DEFAULT_START = "classroom";

export interface AppState {
  graph: CampusGraph;
  tasks: CampusTask[];
  selectedTaskIds: string[];
  startLocationId: string;
  breakMinutes: number;
  agentState: AgentState;
  latestPlan: PlanningResult | null;
  activeSection: string;
}

function defaultState(): AppState {
  return {
    graph: cloneSampleGraph(),
    tasks: cloneSampleTasks(),
    selectedTaskIds: ["t-print", "t-submit", "t-library"],
    startLocationId: DEFAULT_START,
    breakMinutes: DEFAULT_BREAK,
    agentState: initAgentState(DEFAULT_START),
    latestPlan: null,
    activeSection: "dashboard",
  };
}

type Action =
  | { type: "RESET_DEMO" }
  | { type: "SET_SECTION"; section: string }
  | { type: "SET_BREAK"; minutes: number }
  | { type: "SET_START"; locationId: string }
  | { type: "TOGGLE_TASK"; taskId: string }
  | { type: "SET_SELECTED_TASKS"; ids: string[] }
  | { type: "UPDATE_TASK"; task: CampusTask }
  | { type: "ADD_TASK"; task: CampusTask }
  | { type: "REMOVE_TASK"; taskId: string }
  | { type: "MARK_COMPLETE"; taskId: string }
  | { type: "SET_NODE_OPEN"; nodeId: string; open: boolean }
  | { type: "SET_EDGE_BLOCKED"; from: string; to: string; blocked: boolean }
  | { type: "SET_PLAN"; plan: PlanningResult; newAgentState: AgentState }
  | { type: "APPLY_SCENARIO"; label: string; graph: CampusGraph; tasks: CampusTask[] }
  | { type: "UPDATE_QUEUE"; taskId: string; queueMinutes: number; taskTitle: string };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "RESET_DEMO": {
      const fresh = defaultState();
      return fresh;
    }
    case "SET_SECTION":
      return { ...state, activeSection: action.section };
    case "SET_BREAK":
      return { ...state, breakMinutes: action.minutes };
    case "SET_START":
      return {
        ...state,
        startLocationId: action.locationId,
        agentState: { ...state.agentState, currentLocationId: action.locationId },
      };
    case "TOGGLE_TASK": {
      const already = state.selectedTaskIds.includes(action.taskId);
      return {
        ...state,
        selectedTaskIds: already
          ? state.selectedTaskIds.filter((id) => id !== action.taskId)
          : [...state.selectedTaskIds, action.taskId],
      };
    }
    case "SET_SELECTED_TASKS":
      return { ...state, selectedTaskIds: action.ids };
    case "UPDATE_TASK":
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.task.id ? action.task : t)),
      };
    case "ADD_TASK":
      return { ...state, tasks: [...state.tasks, action.task] };
    case "REMOVE_TASK":
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.taskId),
        selectedTaskIds: state.selectedTaskIds.filter((id) => id !== action.taskId),
      };
    case "MARK_COMPLETE": {
      const tasks = state.tasks.map((t) =>
        t.id === action.taskId ? { ...t, completed: true } : t,
      );
      const agentState = {
        ...state.agentState,
        completedTaskIds: [
          ...new Set([...state.agentState.completedTaskIds, action.taskId]),
        ],
      };
      return { ...state, tasks, agentState };
    }
    case "SET_NODE_OPEN": {
      const graph: CampusGraph = {
        ...state.graph,
        nodes: state.graph.nodes.map((n) =>
          n.id === action.nodeId ? { ...n, open: action.open } : n,
        ),
      };
      return { ...state, graph };
    }
    case "SET_EDGE_BLOCKED": {
      const graph: CampusGraph = {
        ...state.graph,
        edges: state.graph.edges.map((e) =>
          e.from === action.from && e.to === action.to
            ? { ...e, blocked: action.blocked }
            : e,
        ),
      };
      return { ...state, graph };
    }
    case "SET_PLAN":
      return {
        ...state,
        latestPlan: action.plan,
        agentState: action.newAgentState,
      };
    case "APPLY_SCENARIO":
      return {
        ...state,
        graph: action.graph,
        tasks: action.tasks,
        latestPlan: null,
        agentState: recordScenario(state.agentState, action.label),
      };
    case "UPDATE_QUEUE": {
      const tasks = state.tasks.map((t) =>
        t.id === action.taskId ? { ...t, queueMinutes: action.queueMinutes } : t,
      );
      const agentState = {
        ...state.agentState,
        queueObservations: {
          ...state.agentState.queueObservations,
          [action.taskId]: action.queueMinutes,
        },
      };
      return { ...state, tasks, agentState };
    }
    default:
      return state;
  }
}

/** Safely parse stored state, falling back to defaults if invalid. */
function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const def = defaultState();
    // Validate basic shapes; fall back on any mismatch.
    return {
      ...def,
      graph: parsed.graph ?? def.graph,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : def.tasks,
      selectedTaskIds: Array.isArray(parsed.selectedTaskIds)
        ? parsed.selectedTaskIds
        : def.selectedTaskIds,
      startLocationId: parsed.startLocationId ?? def.startLocationId,
      breakMinutes:
        typeof parsed.breakMinutes === "number" ? parsed.breakMinutes : def.breakMinutes,
      agentState: parsed.agentState ?? def.agentState,
      latestPlan: null, // Do not restore plan from storage — stale.
      activeSection: "dashboard",
    };
  } catch {
    return defaultState();
  }
}

const PERSIST_KEYS: (keyof AppState)[] = [
  "graph",
  "tasks",
  "selectedTaskIds",
  "startLocationId",
  "breakMinutes",
  "agentState",
];

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    const persisted: Partial<AppState> = {};
    PERSIST_KEYS.forEach((k) => {
      (persisted as Record<string, unknown>)[k] = state[k];
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // Storage may be unavailable (private browsing, quota).
    }
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used inside AppProvider");
  return ctx.state;
}

export function useAppDispatch() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppDispatch must be used inside AppProvider");
  return ctx.dispatch;
}

/** Convenience hook: returns state + dispatch + common actions. */
export function useApp() {
  const { state, dispatch } = useContext(AppContext)!;

  const generatePlanAction = useCallback(
    (plan: PlanningResult, newAgentState: import("@/types/agents").AgentState) =>
      dispatch({ type: "SET_PLAN", plan, newAgentState }),
    [dispatch],
  );

  return { state, dispatch, generatePlanAction };
}
