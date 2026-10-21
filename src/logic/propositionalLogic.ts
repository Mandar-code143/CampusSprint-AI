// [P7 — PROPOSITIONAL LOGIC] Evaluates boolean propositions and derives task eligibility
// using explicit logical rules: E = C AND I AND P.
// C = counter is open, I = task is incomplete, P = all prerequisites satisfied, E = eligible.

export interface EligibilityPropositions {
  /** C: The required counter is currently open. */
  counterOpen: boolean;
  /** I: The task has not yet been completed. */
  taskIncomplete: boolean;
  /** P: All prerequisite tasks are already satisfied. */
  prerequisitesMet: boolean;
}

export interface EligibilityResult extends EligibilityPropositions {
  /** E: The task is eligible to be planned (C AND I AND P). */
  eligible: boolean;
  /** Human-readable explanation of which propositions contributed to the result. */
  explanation: string;
}

/**
 * Evaluates the eligibility rule: E = C AND I AND P.
 * Returns the result with a detailed explanation of each proposition.
 */
export function evaluateEligibility(
  props: EligibilityPropositions,
): EligibilityResult {
  const eligible = props.counterOpen && props.taskIncomplete && props.prerequisitesMet;

  const parts: string[] = [];
  if (!props.counterOpen) parts.push("C=false (counter closed)");
  if (!props.taskIncomplete) parts.push("I=false (already completed)");
  if (!props.prerequisitesMet) parts.push("P=false (prerequisites not met)");

  const explanation = eligible
    ? "E = C AND I AND P = true. Task is eligible for planning."
    : `E = C AND I AND P = false. Reason(s): ${parts.join("; ")}.`;

  return { ...props, eligible, explanation };
}

export interface TruthTableRow {
  C: boolean;
  I: boolean;
  P: boolean;
  E: boolean;
}

/**
 * Generates all 8 rows of the truth table for three boolean inputs (C, I, P).
 * Rows are enumerated algorithmically — none are hardcoded.
 */
export function generateTruthTable(): TruthTableRow[] {
  const rows: TruthTableRow[] = [];
  for (let bits = 0; bits < 8; bits++) {
    const C = Boolean(bits & 4);
    const I = Boolean(bits & 2);
    const P = Boolean(bits & 1);
    const E = C && I && P;
    rows.push({ C, I, P, E });
  }
  return rows;
}

/**
 * Returns a plain English summary of the eligibility rule for educational display.
 */
export function eligibilityRuleDescription(): string {
  return (
    "Eligibility Rule: E = C ∧ I ∧ P\n" +
    "  C = Counter is open at the task location\n" +
    "  I = Task has not already been completed\n" +
    "  P = All prerequisite tasks have been completed\n" +
    "  E = The task is eligible to be planned (true only when all three are true)"
  );
}
