import type { NextApiRequest, NextApiResponse } from "next";
import { readSheet } from "../../lib/excel";
import {
    effectiveMonthlyRate,
    monthsBetween,
    DEFAULT_ANNUAL_RATES,
} from "../../lib/investCalc";

type Row = {
    fy: string;
    investmentId: string | number;
    name: string;
    type?: string;
    rateUsed: number;
    isCustomMaturity: boolean;
    openingValue: number;
    paidInFY: number;
    closingValue: number;
    interest: number;
    maturesOn: string;
};

function parseDate(value?: string): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

// Implied monthly rate when a custom maturity is sensible (a bit above the
// total principal). Otherwise null and the stated rate is used.
function impliedMonthlyRate(
    inv: any,
    amount: number,
    totalMonths: number,
): number | null {
    const custom = Number(inv.customMaturityAmount);
    const type = (inv.type || "").toUpperCase();
    if (!Number.isFinite(custom) || custom <= 0 || amount <= 0) return null;
    const principal = type === "FD" ? amount : amount * totalMonths;
    // Guard against typos: only honor custom maturities within 50% above
    // the principal.
    if (custom <= principal || custom > principal * 1.5) return null;
    if (type === "FD") {
        return Math.pow(custom / amount, 1 / totalMonths) - 1;
    }
    // Annuity FV: custom = amount * ((1+i)^n - 1) / i. Solve for i.
    let lo = 0;
    let hi = 0.1;
    for (let iter = 0; iter < 64; iter++) {
        const mid = (lo + hi) / 2;
        const fv = amount * ((Math.pow(1 + mid, totalMonths) - 1) / mid);
        if (fv < custom) lo = mid;
        else hi = mid;
    }
    return (lo + hi) / 2;
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
        // Accrual basis: interest earned during this FY is income, even if
        // it stays reinvested in the deposit.
        if (end < fyStart || start >= fyEnd) continue;

        const type = (inv.type || "").toUpperCase();
        const isCustomMaturity =
            Number.isFinite(Number(inv.customMaturityAmount)) &&
            Number(inv.customMaturityAmount) > 0;
        const paidTotal = paidById.get(String(inv.id)) ?? 0;
        const totalMonths = Math.max(monthsBetween(start, end), 1);

        // Rate: custom maturity re-spreads the rate when it is sensible;
        // otherwise the stated rate with the chosen compounding.
        const implied = impliedMonthlyRate(inv, amount, totalMonths);
        const entered = Number(inv.interestRate);
        const annual =
            Number.isFinite(entered) && entered > 0
                ? entered / 100
                : (DEFAULT_ANNUAL_RATES[type] ?? 0.065);
        const i =
            implied ?? effectiveMonthlyRate(annual, inv.compounding || "monthly");
        const rateUsed =
            implied !== null
                ? (Math.pow(1 + implied, 12) - 1) * 100
                : annual * 100;
        // Only flag custom maturity when it actually drives the rate.
        const customApplied = implied !== null;

        // Value after k deposits/months at monthly rate i.
        const valueAt = (k: number): number => {
            if (k <= 0) return 0;
            if (type === "FD") return amount * Math.pow(1 + i, k);
            return i > 0
                ? amount * ((Math.pow(1 + i, k) - 1) / i)
                : amount * k;
        };

        // For the current FY, stop accruing at today; past FYs accrue fully.
        const ref = fyEnd < new Date() ? fyEnd : new Date();
        const elapsed = Math.min(
            Math.max(monthsBetween(start, ref), 0),
            totalMonths,
        );
        // Deposits actually made by each FY boundary (limited to installments
        // marked paid for the current/ongoing period).
        const k0 = Math.min(
            Math.max(monthsBetween(start, fyStart), 0),
            elapsed,
            fyEnd < new Date() ? paidTotal : totalMonths,
        );
        const k1 = Math.min(
            Math.max(monthsBetween(start, fyEnd), 0),
            elapsed,
            fyEnd < new Date() ? paidTotal : totalMonths,
        );
        if (k0 === k1 && k1 === 0) continue;

        const openingValue = valueAt(k0);
        const closingValue = valueAt(k1);
        const paidInFY =
            type === "FD" ? (k0 === 0 && k1 > 0 ? amount : 0) : amount * (k1 - k0);
        const interest = closingValue - openingValue - paidInFY;

        rows.push({
            fy: fyLabel,
            investmentId: inv.id,
            name: inv.name,
            type: inv.type,
            rateUsed: Math.round(rateUsed * 100) / 100,
            isCustomMaturity: customApplied,
            openingValue: Math.round(openingValue * 100) / 100,
            paidInFY: Math.round(paidInFY * 100) / 100,
            closingValue: Math.round(closingValue * 100) / 100,
            interest: Math.round(interest * 100) / 100,
            maturesOn: inv.endDate ? String(inv.endDate) : "",
        });
    }

    const totalInterest =
        Math.round(rows.reduce((s, r) => s + r.interest, 0) * 100) / 100;
    const totalPaid =
        Math.round(rows.reduce((s, r) => s + r.paidInFY, 0) * 100) / 100;
    const totalClosing =
        Math.round(rows.reduce((s, r) => s + r.closingValue, 0) * 100) / 100;

    // Annual income package: explicit override wins; else the value saved in
    // settings; else gross earned within the FY from payslips; fallback =
    // latest monthly gross x 12.
    const packageOverride = Number(req.query.package);
    const payslips = await readSheet("payslips");
    const settings = await readSheet("settings");
    const savedPackage = Number(
        settings.find((s) => String(s.key) === "package")?.value,
    );
    let packageIncome = 0;
    let packageSource: "override" | "saved" | "payslips" | "estimate" =
        "estimate";
    if (Number.isFinite(packageOverride) && packageOverride > 0) {
        packageIncome = packageOverride;
        packageSource = "override";
    } else if (Number.isFinite(savedPackage) && savedPackage > 0) {
        packageIncome = savedPackage;
        packageSource = "saved";
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
            packageSource = "payslips";
        } else if (payslips.length > 0) {
            const latest = payslips
                .slice()
                .sort((a, b) =>
                    String(b.date).localeCompare(String(a.date)),
                )[0];
            packageIncome = (Number(latest.gross) || 0) * 12;
            packageSource = "estimate";
        }
    }

    // New-regime slab structure per the Income Tax Department
    // (incometax.gov.in): marginal rate for the slab the total income
    // package falls into. 0-4L nil, 4-8L 5%, 8-12L 10%, 12-16L 15%,
    // 16-20L 20%, 20-24L 25%, above 24L 30%.
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
        totalPaid,
        totalClosing,
        packageIncome,
        packageSource,
        slabRate,
        taxOnInterest,
    });
}
