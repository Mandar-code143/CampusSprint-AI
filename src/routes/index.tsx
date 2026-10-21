import { createFileRoute } from "@tanstack/react-router";
import { AppProvider, useApp } from "@/store/appStore";
import { AppShell } from "@/components/AppShell";
import { DashboardSection } from "@/components/sections/DashboardSection";
import { PlannerSection } from "@/components/sections/PlannerSection";
import { MapSection } from "@/components/sections/MapSection";
import { AlgorithmLabSection } from "@/components/sections/AlgorithmLabSection";
import { ConceptsSection } from "@/components/sections/ConceptsSection";

export const Route = createFileRoute("/")(
  {
    component: App,
  }
);

function SectionRouter() {
  const { state } = useApp();

  return (
    <AppShell>
      {state.activeSection === "dashboard" && <DashboardSection />}
      {state.activeSection === "planner" && <PlannerSection />}
      {state.activeSection === "map" && <MapSection />}
      {state.activeSection === "algorithm-lab" && <AlgorithmLabSection />}
      {state.activeSection === "concepts" && <ConceptsSection />}
    </AppShell>
  );
}

function App() {
  return (
    <AppProvider>
      <SectionRouter />
    </AppProvider>
  );
}
