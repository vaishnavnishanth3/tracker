import type { NextApiRequest, NextApiResponse } from "next";
import { readSheet } from "../../lib/excel";
import { estimateInvestment, monthsBetween } from "../../lib/investCalc";

type Row = {
    fy: string;
    investmentId: string | number;
    name: string;
    type?: string;
    rateUsed: number;
    isCustomMaturity: boolean;
    totalPrincipal: number;
    maturityAmount: number;
    interest: number;
    maturesOn: string;
};

function parseDate(value?: string): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "GET") {
        res.status(405).end();
        return;
    }

    const fyStartYear = Number(req.query.fy);
    if (!Number.isFinite(fyStartYear)) {
        return res
            .status(400)
            .json({ error: "Pass ?fy=<starting year of financial year>" });
    }

    const fyStart = new Date(fyStartYear, 3, 1); // 1 April
    const fyEnd = new Date(fyStartYear + 1, 3, 1); // 1 April next year
    const fyLabel = `FY ${fyStartYear}-${String((fyStartYear + 1) % 100).padStart(2, "0")}`;

    const investments = await readSheet("investments");
    const checklist = await readSheet("checklist");
    const paidById = new Map<string, number>();
    for (const c of checklist) {
        const done = c.done === true || String(c.done).toLowerCase() === "true";
        if (!done) continue;
        const key = String(c.investmentId);
        paidById.set(key, (paidById.get(key) ?? 0) + 1);
    }

    const rows: Row[] = [];

    for (const inv of investments) {
        const amount = Number(inv.amount) || 0;
        const start = parseDate(inv.startDate);
        if (!amount || !start) continue;
        let end = parseDate(inv.endDate);
        if (!end) {
            const termYears = Number(inv.termYears);
            if (Number.isFinite(termYears) && termYears > 0) {
                end = new Date(start);
                end.setFullYear(end.getFullYear() + termYears);
            }
        }
        if (!end || end <= start) continue;
        // Receipt basis: interest is income only in the FY when the
        // investment matures (withdrawal happens).
        if (end < fyStart || end >= fyEnd) continue;

        const type = (inv.type || "").toUpperCase();
        const isCustomMaturity =
            Number.isFinite(Number(inv.customMaturityAmount)) &&
            Number(inv.customMaturityAmount) > 0;
        const paidTotal = paidById.get(String(inv.id)) ?? 0;

        // Same source as the Investments tab: estimate.invested/paid counts
        // and the maturity amount (custom override already applied there).
        const estimate = estimateInvestment(inv, paidTotal);
        if (!estimate) continue;

        const { totalMonths } = estimate;

        // Whole-investment figures.
        // RD: monthly deposits over the full schedule (start to end).
        // FD: single deposit at start.
        const totalPrincipal = type === "FD" ? amount : amount * totalMonths;
        const maturityAmount = estimate.estimatedEndAmount;

        rows.push({
            fy: fyLabel,
            investmentId: inv.id,
            name: inv.name,
            type: inv.type,
            // Same rate shown in the Investments tab tooltip.
            rateUsed: Math.round(estimate.annualRate * 10000) / 100,
            isCustomMaturity,
            totalPrincipal: Math.round(totalPrincipal * 100) / 100,
            maturityAmount: Math.round(maturityAmount * 100) / 100,
            interest: Math.round((maturityAmount - totalPrincipal) * 100) / 100,
            maturesOn: inv.endDate ? String(inv.endDate) : "",
        });
    }

    const totalInterest =
        Math.round(rows.reduce((s, r) => s + r.interest, 0) * 100) / 100;
    const totalPrincipal =
        Math.round(rows.reduce((s, r) => s + r.totalPrincipal, 0) * 100) / 100;
    const totalMaturity =
        Math.round(rows.reduce((s, r) => s + r.maturityAmount, 0) * 100) / 100;

    // Annual income package: explicit override wins; else gross earned within
    // the FY from payslips; fallback = latest monthly gross x 12.
    const packageOverride = Number(req.query.package);
    const payslips = await readSheet("payslips");
    let packageIncome = 0;
    if (Number.isFinite(packageOverride) && packageOverride > 0) {
        packageIncome = packageOverride;
    } else {
        const inFY = payslips.filter((p) => {
            const d = parseDate(p.date ? String(p.date) : undefined);
            return d && d >= fyStart && d < fyEnd;
        });
        if (inFY.length > 0) {
            packageIncome = inFY.reduce(
                (s, p) => s + (Number(p.gross) || 0),
                0,
            );
        } else if (payslips.length > 0) {
            const latest = payslips
                .slice()
                .sort((a, b) =>
                    String(b.date).localeCompare(String(a.date)),
                )[0];
            packageIncome = (Number(latest.gross) || 0) * 12;
        }
    }

    // New-regime slab (FY 2026-27) chosen by the total income package.
    const slabRate =
        packageIncome > 2400000
            ? 0.3
            : packageIncome > 2000000
              ? 0.25
              : packageIncome > 1600000
                ? 0.2
                : packageIncome > 1200000
                  ? 0.15
                  : packageIncome > 800000
                    ? 0.1
                    : packageIncome > 400000
                      ? 0.05
                      : 0;
    const taxOnInterest = Math.round(totalInterest * slabRate * 100) / 100;

    return res.json({
        fy: fyLabel,
        rows,
        totalInterest,
        totalPrincipal,
        totalMaturity,
        packageIncome,
        slabRate,
        taxOnInterest,
    });
}
