// Campus Map section — SVG map derived from the campus graph.
import { useState } from "react";
import { Map as MapIcon, Lock, Unlock, Info } from "lucide-react";
import { useApp } from "@/store/appStore";
import type { CampusNode } from "@/types/campus";

const CATEGORY_COLORS: Record<string, string> = {
  academic: "#3b82f6",
  service: "#10b981",
  administrative: "#f59e0b",
  facility: "#8b5cf6",
  gate: "#6b7280",
};

export function MapSection() {
  const { state, dispatch } = useApp();
  const { graph, latestPlan, startLocationId } = state;
  const [selectedNode, setSelectedNode] = useState<CampusNode | null>(null);

  const routeEdgeSet = new Set(
    (latestPlan?.routeEdges ?? []).map((e) => `${e.from}|${e.to}`)
  );
  const taskNodeIds = new Set(latestPlan?.taskOrderNodeIds ?? []);

  const handleNodeClick = (node: CampusNode) => {
    setSelectedNode(selectedNode?.id === node.id ? null : node);
  };

  const handleSetStart = (nodeId: string) => {
    dispatch({ type: "SET_START", locationId: nodeId });
    setSelectedNode(null);
  };

  const handleToggleOpen = (nodeId: string, currentOpen: boolean) => {
    dispatch({ type: "SET_NODE_OPEN", nodeId, open: !currentOpen });
    setSelectedNode(null);
  };

  return (
    <div className="cs-section">
      <div className="cs-section-header">
        <div className="cs-section-title-row">
          <MapIcon size={20} className="cs-section-icon" />
          <h1 className="cs-section-title">Campus Map</h1>
        </div>
        <p className="cs-section-sub">
          Interactive map of the sample campus graph. Click a node to view details or change settings.
          Highlighted connections show the recommended route.
        </p>
      </div>

      <div className="cs-map-layout">
        <div className="cs-map-wrap">
          <svg
            id="campus-svg-map"
            viewBox="0 0 800 530"
            className="cs-map-svg"
            aria-label="Campus map"
          >
            {/* Edges */}
            {graph.edges.map((edge, i) => {
              const from = graph.nodes.find((n) => n.id === edge.from);
              const to = graph.nodes.find((n) => n.id === edge.to);
              if (!from || !to) return null;
              const isRoute =
                routeEdgeSet.has(`${edge.from}|${edge.to}`) ||
                routeEdgeSet.has(`${edge.to}|${edge.from}`);
              const isBlocked = edge.blocked;
              const mx = (from.x + to.x) / 2;
              const my = (from.y + to.y) / 2;
              return (
                <g key={i}>
                  <line
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={isBlocked ? "#ef4444" : isRoute ? "#0ea5e9" : "#cbd5e1"}
                    strokeWidth={isBlocked ? 2 : isRoute ? 3 : 1.5}
                    strokeDasharray={isBlocked ? "6 3" : "none"}
                  />
                  <text
                    x={mx} y={my - 4}
                    textAnchor="middle"
                    fontSize="9"
                    fill={isBlocked ? "#ef4444" : "#94a3b8"}
                  >
                    {isBlocked ? "✕" : `${edge.minutes}m`}
                  </text>
                  {/* Click to toggle blocked */}
                  <line
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke="transparent"
                    strokeWidth={10}
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      dispatch({ type: "SET_EDGE_BLOCKED", from: edge.from, to: edge.to, blocked: !edge.blocked })
                    }
                  >
                    <title>{isBlocked ? "Click to unblock" : "Click to block this route"}</title>
                  </line>
                </g>
              );
            })}

            {/* Nodes */}
            {graph.nodes.map((node) => {
              const isStart = node.id === startLocationId;
              const isTask = taskNodeIds.has(node.id);
              const isSelected = selectedNode?.id === node.id;
              const color = CATEGORY_COLORS[node.category] ?? "#64748b";
              const taskIdx = latestPlan?.taskOrderNodeIds.indexOf(node.id) ?? -1;
              return (
                <g
                  key={node.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleNodeClick(node)}
                >
                  {/* Highlight ring */}
                  {(isStart || isTask || isSelected) && (
                    <circle
                      cx={node.x} cy={node.y} r={20}
                      fill="none"
                      stroke={isStart ? "#f59e0b" : isSelected ? "#0ea5e9" : "#10b981"}
                      strokeWidth={2.5}
                      opacity={0.7}
                    />
                  )}
                  <circle
                    cx={node.x} cy={node.y} r={14}
                    fill={node.open ? color : "#e2e8f0"}
                    stroke={isStart ? "#f59e0b" : "#fff"}
                    strokeWidth={isStart ? 2.5 : 1.5}
                    opacity={node.open ? 1 : 0.55}
                  />
                  {/* Task order badge */}
                  {taskIdx >= 0 && (
                    <circle cx={node.x + 10} cy={node.y - 10} r={8} fill="#10b981" stroke="#fff" strokeWidth={1.5} />
                  )}
                  {taskIdx >= 0 && (
                    <text x={node.x + 10} y={node.y - 10} textAnchor="middle" dominantBaseline="central" fontSize="9" fill="#fff" fontWeight="bold">
                      {taskIdx + 1}
                    </text>
                  )}
                  {!node.open && (
                    <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="central" fontSize="12" fill="#ef4444">✕</text>
                  )}
                  {/* Label */}
                  <text
                    x={node.x}
                    y={node.y + 22}
                    textAnchor="middle"
                    fontSize="9.5"
                    fill="#1e293b"
                    fontWeight={isStart ? "700" : "500"}
                  >
                    {node.name.length > 18 ? node.name.slice(0, 17) + "…" : node.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Sidebar: legend + selected node info */}
        <div className="cs-map-sidebar">
          {/* Legend */}
          <div className="cs-card">
            <h2 className="cs-card-heading">Legend</h2>
            <div className="cs-legend">
              {Object.entries(CATEGORY_COLORS).map(([cat, col]) => (
                <div key={cat} className="cs-legend-item">
                  <span className="cs-legend-dot" style={{ background: col }} />
                  {cat}
                </div>
              ))}
              <div className="cs-legend-item"><span className="cs-legend-dot" style={{ background: "#f59e0b", border: "2px solid #f59e0b" }} />Start</div>
              <div className="cs-legend-item"><span className="cs-legend-line cs-legend-line--route" />Recommended route</div>
              <div className="cs-legend-item"><span className="cs-legend-line cs-legend-line--blocked" />Blocked route</div>
            </div>
            <div className="cs-map-hint"><Info size={11} /> Click a node to view details. Click an edge to toggle blocked status.</div>
          </div>

          {/* Selected node detail */}
          {selectedNode && (
            <div className="cs-card">
              <h2 className="cs-card-heading">{selectedNode.name}</h2>
              <div className="cs-node-detail">
                <div className="cs-node-row"><span>Category</span><span>{selectedNode.category}</span></div>
                <div className="cs-node-row">
                  <span>Counter</span>
                  <span className={selectedNode.open ? "cs-open" : "cs-closed"}>
                    {selectedNode.open ? "Open" : "Closed"}
                  </span>
                </div>
              </div>
              <div className="cs-node-actions">
                <button
                  id={`btn-set-start-${selectedNode.id}`}
                  className="cs-btn cs-btn--secondary"
                  onClick={() => handleSetStart(selectedNode.id)}
                >
                  Set as Start
                </button>
                <button
                  id={`btn-toggle-open-${selectedNode.id}`}
                  className="cs-btn cs-btn--secondary"
                  onClick={() => handleToggleOpen(selectedNode.id, selectedNode.open)}
                >
                  {selectedNode.open ? <><Lock size={12} /> Close Counter</> : <><Unlock size={12} /> Open Counter</>}
                </button>
              </div>
            </div>
          )}

          {/* Scenarios */}
          <ScenarioPanel />
        </div>
      </div>
    </div>
  );
}

function ScenarioPanel() {
  const { state, dispatch } = useApp();
  const { graph, tasks } = state;

  const applyScenario = (label: string, fn: () => { graph: import("@/types/campus").CampusGraph; tasks: import("@/types/tasks").CampusTask[] }) => {
    const { graph: g, tasks: t } = fn();
    dispatch({ type: "APPLY_SCENARIO", label, graph: g, tasks: t });
  };

  return (
    <div className="cs-card">
      <h2 className="cs-card-heading">Quick Scenarios</h2>
      <div className="cs-scenario-list">
        <button className="cs-scenario-btn" id="scenario-normal" onClick={() => {
          dispatch({ type: "RESET_DEMO" });
        }}>
          A — Normal Campus (Reset)
        </button>
        <button className="cs-scenario-btn" id="scenario-counter-closed" onClick={() => {
          applyScenario("Scenario B: Dept Office closed", () => ({
            graph: {
              ...graph,
              nodes: graph.nodes.map((n) => n.id === "dept-office" ? { ...n, open: false } : n),
            },
            tasks: tasks.map((t) => t.locationId === "dept-office" ? { ...t, available: false } : t),
          }));
        }}>
          B — Counter Closed (Dept Office)
        </button>
        <button className="cs-scenario-btn" id="scenario-long-queue" onClick={() => {
          applyScenario("Scenario C: Long queue at Printing", () => ({
            graph,
            tasks: tasks.map((t) => t.id === "t-print" ? { ...t, queueMinutes: 15 } : t),
          }));
        }}>
          C — Long Queue (Printing +13 min)
        </button>
        <button className="cs-scenario-btn" id="scenario-blocked" onClick={() => {
          applyScenario("Scenario D: Path classroom→printing blocked", () => ({
            graph: {
              ...graph,
              edges: graph.edges.map((e) =>
                e.from === "classroom" && e.to === "printing" ? { ...e, blocked: true } : e,
              ),
            },
            tasks,
          }));
        }}>
          D — Blocked Path (classroom→printing)
        </button>
        <button className="cs-scenario-btn" id="scenario-short-break" onClick={() => {
          applyScenario("Scenario E: Short break (15 min)", () => ({ graph, tasks }));
          dispatch({ type: "SET_BREAK", minutes: 15 });
        }}>
          E — Short Break (15 min)
        </button>
      </div>
    </div>
  );
}
