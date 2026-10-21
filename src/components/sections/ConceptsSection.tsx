// AI Concepts & Report section — viva reference table, viva cards, and project report.
import { useState } from "react";
import { BookOpen, Copy, Check } from "lucide-react";

const PRACTICALS = [
  {
    num: "P1",
    concept: "Simple Reflex Agent",
    feature: "Immediate task screening",
    sourceFile: "src/agents/reflexAgent.ts",
    description: "Evaluates each task against condition-action rules (counter closed, route blocked, time warning) using only the current percept snapshot.",
    demonstrate: "Go to Plan My Break, generate a plan with a closed counter. The reflex agent will mark that task ineligible in the agent explanations.",
  },
  {
    num: "P2",
    concept: "Model-Based Reflex Agent",
    feature: "Internal campus/task state model",
    sourceFile: "src/agents/modelBasedAgent.ts",
    description: "Maintains a mutable internal state: current location, completed tasks, queue observations, event history, and the latest plan snapshot.",
    demonstrate: "Mark a task complete, then generate a plan. The agent state updates and subsequent plans reflect the completed task without re-planning it.",
  },
  {
    num: "P3",
    concept: "Greedy Best-First Search",
    feature: "Heuristic-driven route search",
    sourceFile: "src/algorithms/greedyBestFirst.ts",
    description: "Frontier priority = h(n) only (estimated distance to goal). Fast but not guaranteed to find the minimum-cost route on a weighted graph.",
    demonstrate: "Algorithm Lab → Greedy vs A*. Compare path cost and expanded-node count against A* for the same source/destination.",
  },
  {
    num: "P4",
    concept: "A* Search",
    feature: "Optimal point-to-point pathfinding",
    sourceFile: "src/algorithms/aStar.ts",
    description: "Frontier priority = f(n) = g(n) + h(n). Admissible heuristic (scaled Euclidean distance) ensures minimum-cost route when one exists.",
    demonstrate: "Algorithm Lab → Greedy vs A*. A* shows actual vs heuristic cost and expanded-node count. Also used internally by the planner.",
  },
  {
    num: "P5",
    concept: "CSP and Min-Conflicts",
    feature: "Constraint-based scheduling",
    sourceFile: "src/algorithms/minConflictsScheduler.ts",
    description: "Task positions = variables; domains = 0…n-1. Min-Conflicts local search reduces violated constraints (precedence, deadline, budget) iteratively with seeded restarts.",
    demonstrate: "Algorithm Lab → CSP / Min-Conflicts. See before/after conflict counts, iteration count, and the proposed schedule order.",
  },
  {
    num: "P6",
    concept: "Minimax and Alpha-Beta Pruning",
    feature: "Tic-Tac-Toe game-playing AI",
    sourceFile: "src/algorithms/minimax.ts",
    description: "Recursive Minimax evaluates all game-tree positions; Alpha-Beta Pruning skips branches that cannot affect the best move choice, reducing node evaluations.",
    demonstrate: "Algorithm Lab → Minimax / Tic-Tac-Toe. Play against the AI. Toggle alpha-beta and compare node counts for the same board position.",
  },
  {
    num: "P7",
    concept: "Propositional Logic",
    feature: "Boolean eligibility inference",
    sourceFile: "src/logic/propositionalLogic.ts",
    description: "Rule E = C ∧ I ∧ P. Truth-table rows are generated algorithmically for all 8 combinations of three boolean inputs.",
    demonstrate: "Algorithm Lab → Propositional Logic. Toggle C/I/P and observe E and the full truth table update in real time.",
  },
  {
    num: "P8",
    concept: "First-Order Logic Unification",
    feature: "Task-template term matching",
    sourceFile: "src/logic/unification.ts",
    description: "Robinson unification with occurs check. Typed Term structures (variable, constant, compound) — no string substitution shortcuts.",
    demonstrate: "Algorithm Lab → Unification. Select a template, click Unify, and read the substitution bindings and step-by-step trace.",
  },
  {
    num: "P9",
    concept: "Forward State-Space Search",
    feature: "Campus movement and task planning",
    sourceFile: "src/algorithms/stateSpaceSearch.ts",
    description: "State = (location, task bitmask). Actions: move along unblocked edges, or complete a task at its location if prerequisites satisfied. Uses A* priority with an admissible lower bound.",
    demonstrate: "Algorithm Lab → State-Space or Plan My Break. Observe expanded-state count, action sequence, and frontier peak in the result.",
  },
  {
    num: "P10",
    concept: "Partial-Order Planning",
    feature: "Task prerequisite modeling",
    sourceFile: "src/planning/partialOrderPlanning.ts",
    description: "Builds dependency graph, detects cycles (Kahn's algorithm), validates missing prerequisite references, and produces topological order for acyclic graphs.",
    demonstrate: "Generate a plan with Submit Assignment selected (requires Print Assignment). POP confirms Print → Submit order. Add a dependency cycle to see cycle detection.",
  },
];

const REPORT_TEXT = `CampusSprint: An Intelligent Campus Errand Planning System

Problem Statement:
A student has a limited break (e.g., 20–30 minutes) and several campus errands (printing, library,
office visits). Some counters may be closed, some routes may be blocked, and tasks may have
prerequisites. The student needs an AI-backed plan for the most efficient sequence.

Aim:
Demonstrate classical symbolic AI techniques — search algorithms, intelligent agents, constraint
satisfaction, and logical inference — through a small but complete, interactive campus planner.

Algorithms Implemented:
• Simple Reflex Agent (P1) — immediate condition-action screening
• Model-Based Reflex Agent (P2) — internal campus/task state across observations
• Greedy Best-First Search (P3) — f(n) = h(n) route search
• A* Search (P4) — f(n) = g(n) + h(n) minimum-cost pathfinding
• CSP / Min-Conflicts (P5) — constraint-based scheduling
• Minimax + Alpha-Beta Pruning (P6) — Tic-Tac-Toe game-playing AI
• Propositional Logic (P7) — truth-table and eligibility inference
• FOL Unification (P8) — Robinson unification with occurs check
• Forward State-Space Search (P9) — planning over campus movement and task completion
• Partial-Order Planning (P10) — prerequisite dependency validation

Technology Stack: React 19, TypeScript 5, Vite/TanStack Router, Tailwind CSS 4, Vitest.

Limitations:
• Campus data is illustrative — not real measured distances or times.
• State-space search is bounded to a small task set (bitmask design).
• Heuristic uses scaled Euclidean distance — admissible but not tight.
• No real GPS, live counters, or network integration.

Academic Context: 5th Semester B.Tech AI & Data Science Lab project.`;

export function ConceptsSection() {
  const [copied, setCopied] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(REPORT_TEXT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="cs-section">
      <div className="cs-section-header">
        <div className="cs-section-title-row">
          <BookOpen size={20} className="cs-section-icon" />
          <h1 className="cs-section-title">AI Concepts & Report</h1>
        </div>
        <p className="cs-section-sub">
          Practical mapping table, viva reference cards, and a copyable project report summary.
        </p>
      </div>

      {/* Practical mapping table */}
      <div className="cs-card">
        <h2 className="cs-card-heading">Practical Mapping</h2>
        <div className="cs-table-wrap">
          <table className="cs-concept-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Concept</th>
                <th>Feature</th>
                <th>Source File</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {PRACTICALS.map((p) => (
                <tr key={p.num}>
                  <td><span className="cs-pnum">{p.num}</span></td>
                  <td className="cs-pconcept">{p.concept}</td>
                  <td>{p.feature}</td>
                  <td><code className="cs-pfile">{p.sourceFile}</code></td>
                  <td className="cs-pdesc">{p.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Viva cards */}
      <div className="cs-card">
        <h2 className="cs-card-heading">Viva Reference Cards</h2>
        <p className="cs-card-sub">Click a card to expand the full viva answer.</p>
        <div className="cs-viva-grid">
          {PRACTICALS.map((p) => (
            <div
              key={p.num}
              id={`viva-card-${p.num}`}
              className={`cs-viva-card ${expandedCard === p.num ? "cs-viva-card--open" : ""}`}
              onClick={() => setExpandedCard(expandedCard === p.num ? null : p.num)}
            >
              <div className="cs-viva-header">
                <span className="cs-pnum">{p.num}</span>
                <span className="cs-viva-title">{p.concept}</span>
              </div>
              {expandedCard === p.num && (
                <div className="cs-viva-body">
                  <div className="cs-viva-q">What is it?</div>
                  <div className="cs-viva-a">{p.description}</div>
                  <div className="cs-viva-q">Source file</div>
                  <div className="cs-viva-a"><code>{p.sourceFile}</code></div>
                  <div className="cs-viva-q">How to demonstrate</div>
                  <div className="cs-viva-a">{p.demonstrate}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Report */}
      <div className="cs-card">
        <div className="cs-card-heading-row">
          <h2 className="cs-card-heading">Project Report Summary</h2>
          <button id="btn-copy-report" className="cs-btn cs-btn--secondary" onClick={handleCopy}>
            {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy Report</>}
          </button>
        </div>
        <pre className="cs-report-pre">{REPORT_TEXT}</pre>
      </div>
    </div>
  );
}
