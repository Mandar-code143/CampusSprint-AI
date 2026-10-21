// [P8 — FIRST-ORDER LOGIC UNIFICATION] Computes consistent substitutions between structured logical terms.
// Uses typed Term structures — NOT string replacement. Implements a genuine Robinson-style unification
// algorithm with occurs-check.

/** A logical variable, e.g., ?kind */
export interface VariableTerm {
  kind: "variable";
  name: string;
}

/** A logical constant, e.g., Print */
export interface ConstantTerm {
  kind: "constant";
  value: string;
}

/** A compound predicate with named functor and ordered argument list */
export interface CompoundTerm {
  kind: "compound";
  functor: string;
  args: Term[];
}

export type Term = VariableTerm | ConstantTerm | CompoundTerm;

export type Substitution = Map<string, Term>;

export interface UnificationResult {
  success: boolean;
  substitution: Substitution;
  explanation: string;
  steps: string[];
}

/** Convenience constructors */
export const variable = (name: string): VariableTerm => ({ kind: "variable", name });
export const constant = (value: string): ConstantTerm => ({ kind: "constant", value });
export const compound = (functor: string, ...args: Term[]): CompoundTerm => ({
  kind: "compound",
  functor,
  args,
});

/** Recursively applies a substitution to a term. */
function applySubstitution(term: Term, sub: Substitution): Term {
  if (term.kind === "variable") {
    const bound = sub.get(term.name);
    if (bound === undefined) return term;
    return applySubstitution(bound, sub);
  }
  if (term.kind === "constant") return term;
  return {
    kind: "compound",
    functor: term.functor,
    args: term.args.map((a) => applySubstitution(a, sub)),
  };
}

/** Checks whether variable varName appears inside term (to prevent circular substitutions). */
function occursIn(varName: string, term: Term, sub: Substitution): boolean {
  const resolved = applySubstitution(term, sub);
  if (resolved.kind === "variable") return resolved.name === varName;
  if (resolved.kind === "constant") return false;
  return resolved.args.some((a) => occursIn(varName, a, sub));
}

/** Human-readable term display */
export function termToString(term: Term): string {
  if (term.kind === "variable") return `?${term.name}`;
  if (term.kind === "constant") return term.value;
  if (term.args.length === 0) return term.functor;
  return `${term.functor}(${term.args.map(termToString).join(", ")})`;
}

/**
 * Unifies two logical terms, returning the most general unifier (MGU) when one
 * exists. Implements Robinson unification with an occurs check.
 */
export function unify(t1: Term, t2: Term): UnificationResult {
  const steps: string[] = [];
  const sub: Substitution = new Map();

  function unifyPair(a: Term, b: Term): boolean {
    const ra = applySubstitution(a, sub);
    const rb = applySubstitution(b, sub);

    steps.push(`Unify ${termToString(ra)} with ${termToString(rb)}`);

    // Both are the same variable — already unified.
    if (ra.kind === "variable" && rb.kind === "variable" && ra.name === rb.name) {
      steps.push(`  → Same variable, trivially unified.`);
      return true;
    }

    // Bind variable on left.
    if (ra.kind === "variable") {
      if (occursIn(ra.name, rb, sub)) {
        steps.push(`  ✗ Occurs check failed: ?${ra.name} appears in ${termToString(rb)}.`);
        return false;
      }
      sub.set(ra.name, rb);
      steps.push(`  → Bind ?${ra.name} = ${termToString(rb)}`);
      return true;
    }

    // Bind variable on right.
    if (rb.kind === "variable") {
      if (occursIn(rb.name, ra, sub)) {
        steps.push(`  ✗ Occurs check failed: ?${rb.name} appears in ${termToString(ra)}.`);
        return false;
      }
      sub.set(rb.name, ra);
      steps.push(`  → Bind ?${rb.name} = ${termToString(ra)}`);
      return true;
    }

    // Both constants — must match exactly.
    if (ra.kind === "constant" && rb.kind === "constant") {
      if (ra.value === rb.value) {
        steps.push(`  → Constants match: "${ra.value}".`);
        return true;
      }
      steps.push(`  ✗ Constant mismatch: "${ra.value}" ≠ "${rb.value}".`);
      return false;
    }

    // Both compounds — functors and arity must match.
    if (ra.kind === "compound" && rb.kind === "compound") {
      if (ra.functor !== rb.functor) {
        steps.push(`  ✗ Functor mismatch: "${ra.functor}" ≠ "${rb.functor}".`);
        return false;
      }
      if (ra.args.length !== rb.args.length) {
        steps.push(
          `  ✗ Arity mismatch: ${ra.functor}/${ra.args.length} vs ${rb.functor}/${rb.args.length}.`,
        );
        return false;
      }
      steps.push(`  → Functors match: "${ra.functor}". Unifying ${ra.args.length} argument(s).`);
      for (let i = 0; i < ra.args.length; i++) {
        if (!unifyPair(ra.args[i], rb.args[i])) return false;
      }
      return true;
    }

    // Mismatched term kinds (e.g. constant vs compound).
    steps.push(
      `  ✗ Kind mismatch: ${ra.kind} cannot unify with ${rb.kind}.`,
    );
    return false;
  }

  const ok = unifyPair(t1, t2);

  const substitutionEntries: string[] = [];
  sub.forEach((val, key) => {
    substitutionEntries.push(`?${key} → ${termToString(val)}`);
  });

  return {
    success: ok,
    substitution: sub,
    steps,
    explanation: ok
      ? `Unification succeeded. MGU: { ${substitutionEntries.join(", ") || "∅ (no bindings needed)"} }.`
      : "Unification failed. The two terms cannot be made identical by any substitution.",
  };
}

/** Pre-defined task-template terms used in the Unification Playground. */
export const TASK_TEMPLATES: { label: string; t1: Term; t2: Term }[] = [
  {
    label: "Task(?kind, Assignment) with Task(Print, Assignment)",
    t1: compound("Task", variable("kind"), constant("Assignment")),
    t2: compound("Task", constant("Print"), constant("Assignment")),
  },
  {
    label: "Location(?place) with Location(Library)",
    t1: compound("Location", variable("place")),
    t2: compound("Location", constant("Library")),
  },
  {
    label: "Task(?kind, ?doc) with Task(Submit, Report)",
    t1: compound("Task", variable("kind"), variable("doc")),
    t2: compound("Task", constant("Submit"), constant("Report")),
  },
  {
    label: "Task(Print, ?x) with Task(Submit, Assignment) [should fail]",
    t1: compound("Task", constant("Print"), variable("x")),
    t2: compound("Task", constant("Submit"), constant("Assignment")),
  },
  {
    label: "HasPrereq(?task, ?pre) with HasPrereq(Submit, Print)",
    t1: compound("HasPrereq", variable("task"), variable("pre")),
    t2: compound("HasPrereq", constant("Submit"), constant("Print")),
  },
];
