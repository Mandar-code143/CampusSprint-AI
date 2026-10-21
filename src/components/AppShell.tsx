// Shared layout shell: sidebar navigation + main content area.
import { type ReactNode } from "react";
import {
  LayoutDashboard,
  Route,
  Map,
  FlaskConical,
  BookOpen,
  RefreshCw,
  GraduationCap,
} from "lucide-react";
import { useApp } from "@/store/appStore";
import { cloneSampleGraph } from "@/data/sampleCampus";
import { cloneSampleTasks } from "@/data/sampleTasks";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "planner", label: "Plan My Break", icon: Route },
  { id: "map", label: "Campus Map", icon: Map },
  { id: "algorithm-lab", label: "Algorithm Lab", icon: FlaskConical },
  { id: "concepts", label: "AI Concepts & Report", icon: BookOpen },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { state, dispatch } = useApp();

  const handleReset = () => {
    if (confirm("Reset Demo will restore original sample data and clear the current plan. Continue?")) {
      dispatch({ type: "RESET_DEMO" });
    }
  };

  return (
    <div className="cs-shell">
      {/* Sidebar */}
      <aside className="cs-sidebar">
        <div className="cs-sidebar-brand">
          <GraduationCap size={22} className="cs-brand-icon" />
          <div>
            <div className="cs-brand-name">CampusSprint AI</div>
            <div className="cs-brand-sub">AI Lab Project · 5th Sem</div>
          </div>
        </div>

        <nav className="cs-nav">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`nav-${id}`}
              className={`cs-nav-item ${state.activeSection === id ? "cs-nav-item--active" : ""}`}
              onClick={() => dispatch({ type: "SET_SECTION", section: id })}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="cs-sidebar-footer">
          <button id="btn-reset-demo" className="cs-reset-btn" onClick={handleReset}>
            <RefreshCw size={14} />
            Reset Demo
          </button>
          <div className="cs-footer-note">All data is illustrative sample data for academic demonstration.</div>
        </div>
      </aside>

      {/* Main content */}
      <main className="cs-main">
        {children}
      </main>
    </div>
  );
}
