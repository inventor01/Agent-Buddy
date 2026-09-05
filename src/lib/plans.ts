export type PlanId = "starter" | "pro" | "studio";

export interface Plan {
  id: PlanId;
  name: string;
  /** Old price before the uplift. */
  oldPrice: number;
  /** Live price — 50% above the old price. */
  price: number;
  blurb: string;
  buddyLimit: number;
  runsPerMonth: number;
  /** What it costs us to serve one seat for a month. */
  monthlyCost: number;
  whiteLabel: boolean;
  perks: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: "starter",
    name: "Starter",
    oldPrice: 8,
    price: 12,
    blurb: "One or two helpers, checked every day.",
    buddyLimit: 3,
    runsPerMonth: 90,
    monthlyCost: 3.9,
    whiteLabel: false,
    perks: [
      "Up to 3 helpers",
      "3 automatic check-ins a day",
      "Live deals with a link to where each one came from",
      "Voice setup and read-aloud",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    oldPrice: 26,
    price: 39,
    blurb: "A full team of helpers running all day.",
    buddyLimit: 10,
    runsPerMonth: 600,
    monthlyCost: 14,
    whiteLabel: true,
    perks: [
      "Up to 10 helpers",
      "20 automatic check-ins a day",
      "Your own name, logo letters and colour on the whole app",
      "Full history of everything each helper found",
    ],
  },
  studio: {
    id: "studio",
    name: "Studio",
    oldPrice: 99,
    price: 149,
    blurb: "Run it as your own product for your own customers.",
    buddyLimit: 50,
    runsPerMonth: 4000,
    monthlyCost: 62,
    whiteLabel: true,
    perks: [
      "Up to 50 helpers",
      "Check-ins every hour, around the clock",
      "Full re-brand: name, letters, tagline, colour",
      "Priority support and early access to new helper types",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["starter", "pro", "studio"];

export function planOf(id: string | null | undefined): Plan {
  return PLANS[(id as PlanId) ?? "starter"] ?? PLANS.starter;
}

/** Gross margin as a percentage of the live price. */
export function marginPct(plan: Plan) {
  return Math.round(((plan.price - plan.monthlyCost) / plan.price) * 100);
}

/** How much the price went up. */
export function upliftPct(plan: Plan) {
  return Math.round(((plan.price - plan.oldPrice) / plan.oldPrice) * 100);
}
