import type { NextApiRequest, NextApiResponse } from "next";
import { readSheet } from "../../lib/excel";
import { estimateInvestment } from "../../lib/investCalc";

// Aggregated money summary: how much was earned, spent, returned
// (investment interest/gains) and how much income tax was paid.
// Buckets are calendar months and calendar years.

type Bucket = {
    label: string;
    earned: number;
    spent: number;
    returned: number;
    tax: number;
    net: number;
};

function parseDate(value?: string): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

function monthKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "GET") {
        res.status(405).end();
        return;
    }

    const [expenses, earnings, investments, checklist] = await Promise.all([
        readSheet("expenses"),
        readSheet("earnings"),
        readSheet("investments"),
        readSheet("checklist"),
    ]);

    // How many installments were actually paid per investment.
    const paidCounts = new Map<string, number>();
    for (const c of checklist) {
        const done = c.done === true || String(c.done).toLowerCase() === "true";
        if (!done) continue;
        const key = String(c.investmentId);
        paidCounts.set(key, (paidCounts.get(key) ?? 0) + 1);
    }

    // "Returned" = interest/gains earned to date across investments.
    // We can't attribute gains to exact past months without a full history,
    // so each investment's interest-to-date is credited to the month it
    // started (the point from which it began accruing). SIPs have no
    // estimable gain, so they contribute 0 unless a value is derivable.
    const returns: { date: Date; amount: number }[] = [];
    for (const inv of investments) {
        const est = estimateInvestment(
            inv,
            paidCounts.get(String(inv.id)) ?? 0,
        );
        if (!est || !est.interestToDate) continue;
        const start = parseDate(inv.startDate);
        if (!start) continue;
        returns.push({ date: start, amount: est.interestToDate });
    }

    const monthly = new Map<string, Bucket>();
    const yearly = new Map<string, Bucket>();

    const bucketFor = (
        map: Map<string, Bucket>,
        key: string,
        label: string,
    ): Bucket => {
        let b = map.get(key);
        if (!b) {
            b = { label, earned: 0, spent: 0, returned: 0, tax: 0, net: 0 };
            map.set(key, b);
        }
        return b;
    };

    // Spent: expenses by their date.
    for (const e of expenses) {
        const d = parseDate(e.date ? String(e.date) : undefined);
        if (!d) continue;
        const amt = Number(e.amount) || 0;
        const mk = monthKey(d);
        const yk = String(d.getFullYear());
        bucketFor(monthly, mk, mk).spent += amt;
        bucketFor(yearly, yk, yk).spent += amt;
    }

    // Earned + income tax: manual earnings entries by their date.
    for (const e of earnings) {
        const d = parseDate(e.date ? String(e.date) : undefined);
        if (!d) continue;
        const mk = monthKey(d);
        const yk = String(d.getFullYear());
        const mb = bucketFor(monthly, mk, mk);
        const yb = bucketFor(yearly, yk, yk);
        mb.earned += Number(e.earned) || 0;
        mb.tax += Number(e.tax) || 0;
        yb.earned += Number(e.earned) || 0;
        yb.tax += Number(e.tax) || 0;
    }

    // Returned: investment gains.
    for (const r of returns) {
        const mk = monthKey(r.date);
        const yk = String(r.date.getFullYear());
        bucketFor(monthly, mk, mk).returned += r.amount;
        bucketFor(yearly, yk, yk).returned += r.amount;
    }

    const finish = (b: Bucket): Bucket => ({
        ...b,
        earned: round2(b.earned),
        spent: round2(b.spent),
        returned: round2(b.returned),
        tax: round2(b.tax),
        net: round2(b.earned + b.returned - b.spent - b.tax),
    });

    const sortedMonths = [...monthly.keys()].sort();
    // Last 4 calendar months (most recent first), regardless of activity.
    const now = new Date();
    const lastFour: Bucket[] = [];
    for (let i = 0; i < 4; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mk = monthKey(d);
        lastFour.push(
            finish(monthly.get(mk) ?? { label: mk, earned: 0, spent: 0, returned: 0, tax: 0, net: 0 }),
        );
    }

    const years = [...yearly.keys()]
        .sort()
        .reverse()
        .map((k) => finish(yearly.get(k)!));

    return res.json({
        generatedAt: now.toISOString(),
        fourMonths: lastFour,
        years,
        // Full monthly history (ascending) in case the UI wants more later.
        months: sortedMonths.map((k) => finish(monthly.get(k)!)),
    });
}
