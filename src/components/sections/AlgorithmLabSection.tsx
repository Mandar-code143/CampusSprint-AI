// Algorithm Lab section — interactive demos for each algorithm.
import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { useApp } from "@/store/appStore";
import { aStarSearch } from "@/algorithms/aStar";
import { greedyBestFirstSearch } from "@/algorithms/greedyBestFirst";
import { forwardStateSpaceSearch } from "@/algorithms/stateSpaceSearch";
import { minConflictsSchedule } from "@/algorithms/minConflictsScheduler";
import { minimaxMove, emptyBoard, evaluateBoard, availableMoves, type Board, type Cell } from "@/algorithms/minimax";
import { generateTruthTable, evaluateEligibility } from "@/logic/propositionalLogic";
import { unify, TASK_TEMPLATES, termToString } from "@/logic/unification";
import type { RouteResult } from "@/types/planning";

type LabTab = "routes" | "statespace" | "csp" | "logic" | "unification" | "minimax";

const TABS: { id: LabTab; label: string }[] = [
  { id: "routes", label: "Greedy vs A*" },
  { id: "statespace", label: "State-Space" },
  { id: "csp", label: "CSP / Min-Conflicts" },
  { id: "logic", label: "Propositional Logic" },
  { id: "unification", label: "Unification" },
  { id: "minimax", label: "Minimax / Tic-Tac-Toe" },
];

export function AlgorithmLabSection() {
  const [activeTab, setActiveTab] = useState<LabTab>("routes");

  return (
    <div className="cs-section">
      <div className="cs-section-header">
        <div className="cs-section-title-row">
          <FlaskConical size={20} className="cs-section-icon" />
          <h1 className="cs-section-title">Algorithm Lab</h1>
        </div>
        <p className="cs-section-sub">
          Interactive demonstrations of every AI algorithm implemented in this project.
          Results are produced by the actual source code.
        </p>
      </div>

      <div className="cs-lab-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            id={`lab-tab-${tab.id}`}
            className={`cs-lab-tab ${activeTab === tab.id ? "cs-lab-tab--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="cs-lab-body">
        {activeTab === "routes" && <RouteComparisonDemo />}
        {activeTab === "statespace" && <StateSpaceDemo />}
        {activeTab === "csp" && <CSPDemo />}
        {activeTab === "logic" && <LogicDemo />}
        {activeTab === "unification" && <UnificationDemo />}
        {activeTab === "minimax" && <MinimaxDemo />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────── Route Comparison ── */
function RouteComparisonDemo() {
  const { state } = useApp();
  const { graph } = state;
  const nodeIds = graph.nodes.map((n) => n.id);

  const [from, setFrom] = useState(nodeIds[0] ?? "");
  const [to, setTo] = useState(nodeIds[3] ?? "");
  const [results, setResults] = useState<{ astar: RouteResult; greedy: RouteResult } | null>(null);

  const run = () => {
    setResults({
      astar: aStarSearch(graph, from, to),
      greedy: greedyBestFirstSearch(graph, from, to),
    });
  };

  return (
    <div className="cs-lab-panel">
      <h2 className="cs-lab-heading">Greedy Best-First Search vs A* Route Comparison</h2>
      <p className="cs-lab-desc">
        Both algorithms find a route between two campus locations using the same graph.
        Greedy uses only h(n); A* uses f(n) = g(n) + h(n). The actual costs and expanded-node
        counts may differ.
      </p>
      <div className="cs-lab-controls">
        <label className="cs-lab-label">From
          <select className="cs-select" value={from} onChange={(e) => setFrom(e.target.value)}>
            {graph.nodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
        </label>
        <label className="cs-lab-label">To
          <select className="cs-select" value={to} onChange={(e) => setTo(e.target.value)}>
            {graph.nodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
        </label>
        <button id="btn-run-routes" className="cs-btn cs-btn--primary" onClick={run}>Run Comparison</button>
      </div>
      {results && (
        <div className="cs-compare-grid">
          {["greedy", "astar"].map((key) => {
            const r = results[key as keyof typeof results];
            return (
              <div key={key} className="cs-compare-col">
                <div className="cs-compare-header">
                  {key === "greedy" ? "Greedy Best-First  [P3]" : "A* Search  [P4]"}
                </div>
                <div className="cs-compare-formula">
                  {key === "greedy" ? "Priority: f(n) = h(n)" : "Priority: f(n) = g(n) + h(n)"}
                </div>
                <div className={`cs-compare-status ${r.success ? "cs-status--ok" : "cs-status--fail"}`}>
                  {r.success ? "Route found" : "No route"}
                </div>
                {r.success && (
                  <>
                    <div className="cs-compare-row"><span>Path</span><span className="cs-compare-path">{r.path.map(id => graph.nodes.find(n => n.id === id)?.name ?? id).join(" → ")}</span></div>
                    <div className="cs-compare-row"><span>Cost</span><span>{r.costMinutes} min</span></div>
                  </>
                )}
                <div className="cs-compare-row"><span>Nodes expanded</span><span>{r.expandedNodes}</span></div>
                <div className="cs-compare-row"><span>Frontier insertions</span><span>{r.frontierInsertions}</span></div>
                <div className="cs-compare-note">{r.explanation}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────── State-Space ── */
function StateSpaceDemo() {
  const { state } = useApp();
  const { graph, tasks, selectedTaskIds, startLocationId, breakMinutes } = state;
  const [result, setResult] = useState<ReturnType<typeof forwardStateSpaceSearch> | null>(null);

  const run = () => {
    setResult(forwardStateSpaceSearch({
      graph, tasks, selectedTaskIds, startLocationId, breakMinutes,
    }));
  };

  return (
    <div className="cs-lab-panel">
      <h2 className="cs-lab-heading">Forward State-Space Search  [P9]</h2>
      <p className="cs-lab-desc">
        Explores combined movement and task-completion states from the starting campus location.
        Uses an admissible heuristic (remaining service time + nearest task travel estimate).
        The task selection from the Planner is used as the goal.
      </p>
      <div className="cs-lab-controls">
        <button id="btn-run-statespace" className="cs-btn cs-btn--primary" onClick={run}>Run State-Space Search</button>
      </div>
      {result && (
        <div className="cs-lab-result">
          <div className={`cs-compare-status ${result.goalReached ? "cs-status--ok" : "cs-status--warn"}`}>
            {result.goalReached ? "Goal reached — all plannable tasks completed" : "Partial plan — best feasible subset"}
          </div>
          <div className="cs-compare-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <div className="cs-stat-card"><div className="cs-stat-label">States Expanded</div><div className="cs-stat-value">{result.expandedStates}</div></div>
            <div className="cs-stat-card"><div className="cs-stat-label">Frontier Peak</div><div className="cs-stat-value">{result.frontierPeak}</div></div>
            <div className="cs-stat-card"><div className="cs-stat-label">Elapsed (min)</div><div className="cs-stat-value">{result.elapsedMinutes}</div></div>
          </div>
          {result.actions.length > 0 && (
            <div className="cs-lab-actions">
              <h3 className="cs-lab-sub">Action Sequence</h3>
              {result.actions.map((a, i) => (
                <div key={i} className="cs-action-row">
                  <span className={`cs-action-badge cs-action-badge--${a.type}`}>{a.type}</span>
                  {a.type === "move" && <span>{graph.nodes.find(n => n.id === a.fromId)?.name} → {graph.nodes.find(n => n.id === a.toId)?.name} ({a.minutes} min)</span>}
                  {a.type === "complete" && <span>{tasks.find(t => t.id === a.taskId)?.title} (queue {a.queueMinutes} + service {a.serviceMinutes} min)</span>}
                </div>
              ))}
            </div>
          )}
          {result.excludedTasks.length > 0 && (
            <div className="cs-lab-excludes">
              <h3 className="cs-lab-sub">Excluded Tasks</h3>
              {result.excludedTasks.map((e) => (
                <div key={e.taskId} className="cs-exclude-row">
                  <span>{tasks.find(t => t.id === e.taskId)?.title ?? e.taskId}</span>: {e.reason}
                </div>
              ))}
            </div>
          )}
          {result.exploredSamples.length > 0 && (
            <details className="cs-details">
              <summary>Explored state samples</summary>
              <div className="cs-samples">
                {result.exploredSamples.map((s, i) => (
                  <div key={i} className="cs-sample-row">
                    <span>{graph.nodes.find(n => n.id === s.locationId)?.name ?? s.locationId}</span>
                    <span>{s.completedTaskIds.length} done</span>
                    <span>{s.elapsedMinutes.toFixed(1)} min</span>
                    <span>f={s.priority.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────── CSP ── */
function CSPDemo() {
  const { state } = useApp();
  const { graph, tasks, selectedTaskIds, breakMinutes } = state;
  const [result, setResult] = useState<ReturnType<typeof minConflictsSchedule> | null>(null);

  const run = () => {
    setResult(minConflictsSchedule({ graph, tasks, selectedTaskIds, breakMinutes }));
  };

  return (
    <div className="cs-lab-panel">
      <h2 className="cs-lab-heading">CSP and Min-Conflicts Scheduler  [P5]</h2>
      <p className="cs-lab-desc">
        Treats task ordering as a Constraint Satisfaction Problem. Variables = task positions,
        domains = 0…n-1. Min-Conflicts reduces violated constraints (precedence, deadline, availability,
        budget) by iteratively reassigning conflicted variables to the value minimising total conflicts.
      </p>
      <div className="cs-lab-controls">
        <button id="btn-run-csp" className="cs-btn cs-btn--primary" onClick={run}>Run Min-Conflicts</button>
      </div>
      {result && (
        <div className="cs-lab-result">
          <div className={`cs-compare-status ${result.success ? "cs-status--ok" : "cs-status--warn"}`}>
            {result.success ? "Conflict-free schedule found" : `Best-effort — ${result.conflictsAfter} conflict(s) remain`}
          </div>
          <div className="cs-compare-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <div className="cs-stat-card"><div className="cs-stat-label">Conflicts Before</div><div className="cs-stat-value">{result.conflictsBefore}</div></div>
            <div className="cs-stat-card"><div className="cs-stat-label">Conflicts After</div><div className="cs-stat-value">{result.conflictsAfter}</div></div>
            <div className="cs-stat-card"><div className="cs-stat-label">Iterations</div><div className="cs-stat-value">{result.iterations}</div></div>
            <div className="cs-stat-card"><div className="cs-stat-label">Restarts</div><div className="cs-stat-value">{result.restarts}</div></div>
            <div className="cs-stat-card"><div className="cs-stat-label">Schedule Time</div><div className="cs-stat-value">{Number.isFinite(result.scheduleTotalMinutes) ? `${result.scheduleTotalMinutes} min` : "∞"}</div></div>
          </div>
          {result.order.length > 0 && (
            <div className="cs-lab-actions">
              <h3 className="cs-lab-sub">Proposed Order</h3>
              {result.order.map((id, i) => (
                <div key={id} className="cs-action-row">
                  <span className="cs-action-badge cs-action-badge--complete">{i + 1}</span>
                  <span>{tasks.find(t => t.id === id)?.title ?? id}</span>
                  {result.completionMinutes[id] !== undefined && (
                    <span className="cs-action-meta">done at min {result.completionMinutes[id].toFixed(1)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {result.remainingConflicts.length > 0 && (
            <div className="cs-lab-excludes">
              <h3 className="cs-lab-sub">Remaining Conflicts</h3>
              {result.remainingConflicts.map((c, i) => (
                <div key={i} className="cs-exclude-row">{c}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────── Logic ── */
function LogicDemo() {
  const [C, setC] = useState(true);
  const [I, setI] = useState(true);
  const [P, setP] = useState(true);
  const result = evaluateEligibility({ counterOpen: C, taskIncomplete: I, prerequisitesMet: P });
  const table = generateTruthTable();

  return (
    <div className="cs-lab-panel">
      <h2 className="cs-lab-heading">Propositional Logic — Eligibility Inference  [P7]</h2>
      <p className="cs-lab-desc">
        Rule: <strong>E = C ∧ I ∧ P</strong>. Toggle propositions to see the derived result.
        The truth table below is generated algorithmically for all 8 input combinations.
      </p>
      <div className="cs-logic-controls">
        {[
          { label: "C — Counter Open", val: C, set: setC },
          { label: "I — Task Incomplete", val: I, set: setI },
          { label: "P — Prerequisites Met", val: P, set: setP },
        ].map(({ label, val, set }) => (
          <label key={label} className="cs-logic-toggle">
            <input type="checkbox" checked={val} onChange={() => set(!val)} />
            <span>{label} = <strong>{val ? "true" : "false"}</strong></span>
          </label>
        ))}
      </div>
      <div className={`cs-logic-result ${result.eligible ? "cs-status--ok" : "cs-status--fail"}`}>
        E = {result.eligible ? "true — Task ELIGIBLE" : "false — Task NOT ELIGIBLE"}
      </div>
      <div className="cs-logic-explanation">{result.explanation}</div>

      <h3 className="cs-lab-sub">Truth Table (all 8 combinations)</h3>
      <table className="cs-truth-table">
        <thead>
          <tr><th>C</th><th>I</th><th>P</th><th>E = C ∧ I ∧ P</th></tr>
        </thead>
        <tbody>
          {table.map((row, i) => {
            const isCurrent = row.C === C && row.I === I && row.P === P;
            return (
              <tr key={i} className={isCurrent ? "cs-truth-row--current" : ""}>
                <td>{row.C ? "T" : "F"}</td>
                <td>{row.I ? "T" : "F"}</td>
                <td>{row.P ? "T" : "F"}</td>
                <td className={row.E ? "cs-truth-true" : "cs-truth-false"}>{row.E ? "T" : "F"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────────────────── Unification ── */
function UnificationDemo() {
  const [templateIdx, setTemplateIdx] = useState(0);
  const [result, setResult] = useState<ReturnType<typeof unify> | null>(null);
  const tpl = TASK_TEMPLATES[templateIdx];

  const run = () => {
    setResult(unify(tpl.t1, tpl.t2));
  };

  return (
    <div className="cs-lab-panel">
      <h2 className="cs-lab-heading">First-Order Logic Unification  [P8]</h2>
      <p className="cs-lab-desc">
        Computes the Most General Unifier (MGU) between two structured logical terms using
        Robinson unification with an occurs check. Select a template or observe the substitution steps.
      </p>
      <div className="cs-lab-controls">
        <label className="cs-lab-label">Template
          <select className="cs-select" value={templateIdx} onChange={(e) => { setTemplateIdx(Number(e.target.value)); setResult(null); }}>
            {TASK_TEMPLATES.map((t, i) => <option key={i} value={i}>{t.label}</option>)}
          </select>
        </label>
        <button id="btn-run-unification" className="cs-btn cs-btn--primary" onClick={run}>Unify</button>
      </div>
      {tpl && (
        <div className="cs-unify-terms">
          <div className="cs-unify-term"><span className="cs-term-label">Term 1:</span> {termToString(tpl.t1)}</div>
          <div className="cs-unify-term"><span className="cs-term-label">Term 2:</span> {termToString(tpl.t2)}</div>
        </div>
      )}
      {result && (
        <div className="cs-lab-result">
          <div className={`cs-compare-status ${result.success ? "cs-status--ok" : "cs-status--fail"}`}>
            {result.success ? "Unification succeeded" : "Unification failed"}
          </div>
          <div className="cs-logic-explanation">{result.explanation}</div>
          {result.steps.length > 0 && (
            <details className="cs-details">
              <summary>Unification steps ({result.steps.length})</summary>
              <div className="cs-samples">
                {result.steps.map((s, i) => <div key={i} className="cs-sample-row">{s}</div>)}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────── Minimax / Tic-Tac-Toe ── */
function MinimaxDemo() {
  const [board, setBoard] = useState<Board>(emptyBoard());
  const [alphaBeta, setAlphaBeta] = useState(true);
  const [lastRun, setLastRun] = useState<ReturnType<typeof minimaxMove> | null>(null);
  const [status, setStatus] = useState<string>("Your turn (X).");
  const [withAB, setWithAB] = useState<ReturnType<typeof minimaxMove> | null>(null);
  const [withoutAB, setWithoutAB] = useState<ReturnType<typeof minimaxMove> | null>(null);

  const gameState = evaluateBoard(board);

  const humanMove = (idx: number) => {
    if (gameState.over || board[idx] !== null) return;
    const next = [...board] as Board;
    next[idx] = "X";
    const gs = evaluateBoard(next);
    if (gs.over) {
      setBoard(next);
      setStatus(gs.winner ? `${gs.winner} wins!` : "Draw!");
      return;
    }
    // AI plays
    const runAB = minimaxMove(next, "O", true);
    const runNoAB = minimaxMove(next, "O", false);
    setWithAB(runAB);
    setWithoutAB(runNoAB);
    const aiRun = alphaBeta ? runAB : runNoAB;
    setLastRun(aiRun);
    if (aiRun.move !== null) {
      next[aiRun.move] = "O";
    }
    const gs2 = evaluateBoard(next);
    setBoard([...next]);
    if (gs2.over) {
      setStatus(gs2.winner ? `${gs2.winner} wins!` : "Draw!");
    } else {
      setStatus("Your turn (X).");
    }
  };

  const resetGame = () => {
    setBoard(emptyBoard());
    setLastRun(null);
    setWithAB(null);
    setWithoutAB(null);
    setStatus("Your turn (X).");
  };

  return (
    <div className="cs-lab-panel">
      <h2 className="cs-lab-heading">Minimax and Alpha-Beta Pruning — Tic-Tac-Toe  [P6]</h2>
      <p className="cs-lab-desc">
        You play as X; the AI plays as O using Minimax search. Toggle Alpha-Beta Pruning to compare
        node counts. Actual node evaluations and cutoff counts are displayed after each AI move.
      </p>
      <div className="cs-ttt-layout">
        <div className="cs-ttt-left">
          <div className="cs-ttt-status">{status}</div>
          <div className="cs-ttt-board">
            {board.map((cell, i) => {
              const isWinning = gameState.winningLine?.includes(i);
              return (
                <button
                  key={i}
                  id={`ttt-cell-${i}`}
                  className={`cs-ttt-cell ${isWinning ? "cs-ttt-cell--win" : ""}`}
                  onClick={() => humanMove(i)}
                  disabled={cell !== null || gameState.over}
                >
                  {cell ?? ""}
                </button>
              );
            })}
          </div>
          <div className="cs-ttt-controls">
            <label className="cs-logic-toggle">
              <input type="checkbox" checked={alphaBeta} onChange={() => setAlphaBeta(!alphaBeta)} />
              <span>Use Alpha-Beta Pruning</span>
            </label>
            <button id="btn-ttt-reset" className="cs-btn cs-btn--secondary" onClick={resetGame}>Reset Game</button>
          </div>
        </div>
        <div className="cs-ttt-right">
          {(withAB || withoutAB) && (
            <div className="cs-compare-grid">
              <div className="cs-compare-col">
                <div className="cs-compare-header">With Alpha-Beta</div>
                <div className="cs-compare-row"><span>Nodes evaluated</span><span>{withAB?.nodesEvaluated ?? "—"}</span></div>
                <div className="cs-compare-row"><span>Cutoffs</span><span>{withAB?.cutoffs ?? "—"}</span></div>
              </div>
              <div className="cs-compare-col">
                <div className="cs-compare-header">Without Alpha-Beta</div>
                <div className="cs-compare-row"><span>Nodes evaluated</span><span>{withoutAB?.nodesEvaluated ?? "—"}</span></div>
                <div className="cs-compare-row"><span>Cutoffs</span><span>0</span></div>
              </div>
            </div>
          )}
          {lastRun && (
            <div className="cs-logic-explanation">
              AI chose move {lastRun.move}. Score: {lastRun.score}. Nodes evaluated: {lastRun.nodesEvaluated}. Cutoffs: {lastRun.cutoffs}.
            </div>
          )}
          <div className="cs-compare-note">
            Node counts vary with board position. Alpha-Beta pruning skips branches that cannot change
            the minimax decision, reducing evaluations — especially in mid-game positions.
          </div>
        </div>
      </div>
    </div>
  );
}
