// Background estimation logic for the Investments tab.
// Pure functions only - safe to import from both API routes and the client.

export type InvestmentLike = {
    id: string | number;
    name?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    amount?: string | number;
    termYears?: string | number;
    compounding?: string;
    interestRate?: string | number;
    customMaturityAmount?: string | number;
    currentAmount?: string | number;
    debitDay?: string | number;
    paidMonths?: string | number;
};

export type InvestmentEstimate = {
    calculatedEndAmount: number;
    customMaturityAmount: number | null;
    estimatedEndAmount: number;
    currentValue: number;
    paidToDate: number;
    interestToDate: number;
    annualRate: number;
    compounding: string;
    totalMonths: number;
    paidInstallments: number;
    isCustomMaturity: boolean;
    isCustomCurrent: boolean;
};

// Expected annual return per investment type.
// Used when no explicit interest rate is entered for the investment.
// SIP is intentionally absent: mutual fund returns are market-linked
// and have no fixed rate.
export const DEFAULT_ANNUAL_RATES: Record<string, number> = {
    RD: 0.065,
    FD: 0.065,
};

const FALLBACK_RATE = 0.065;

export type Compounding = "monthly" | "quarterly" | "half-yearly" | "annually";

const PERIODS_PER_YEAR: Record<Compounding, number> = {
    monthly: 12,
    quarterly: 4,
    "half-yearly": 2,
    annually: 1,
};

/**
 * Convert a nominal annual rate to an effective monthly rate for the given
 * compounding frequency: a nominal rate r compounded k times/year grows by
 * (1 + r/k)^(k/12) - 1 per month.
 */
export function effectiveMonthlyRate(
    annualRate: number,
    compounding?: string,
): number {
    const k = PERIODS_PER_YEAR[(compounding || "monthly") as Compounding] ?? 12;
    return Math.pow(1 + annualRate / k, k / 12) - 1;
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

function parseDate(value?: string): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

export function monthsBetween(start: Date, end: Date): number {
    const months =
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth());
    return Math.max(months, 0);
}

/**
 * Estimate the maturity ("end") amount of an investment as of `today`.
 *
 * - SIP: market-linked, no fixed rate or maturity. Returns an estimate whose
 *   current value comes solely from the manually entered current amount; all
 *   maturity fields are zero.
 * - RD: `amount` is treated as a monthly installment. The estimate is the
 *   future value at the end date of the installments already paid (grown to the
 *   end date) plus the future value of the remaining scheduled installments.
 * - FD: `amount` is a one-time principal compounding monthly until the end date.
 *
 * `paidInstallments` is the number of installments actually paid so far
 * (derived from the checklist sheet).
 *
 * Returns null when there is not enough information to estimate
 * (missing/invalid amount, start date, or end date/term).
 */
export function estimateInvestment(
    inv: InvestmentLike,
    paidInstallments: number,
    today: Date = new Date(),
): InvestmentEstimate | null {
    const amount = Number(inv.amount);
    if (!Number.isFinite(amount) || amount <= 0) return null;

    const start = parseDate(inv.startDate);
    if (!start) return null;

    const type = (inv.type || "").toUpperCase();

    // SIPs are market-linked mutual fund investments: there is no fixed
    // interest rate, no compounding frequency, and no maturity amount that
    // can be estimated. The only meaningful number is the current value,
    // which the user enters manually (e.g. from the fund's NAV statement).
    if (type === "SIP") {
        const customCurrent = Number(inv.currentAmount);
        const hasCurrent =
            Number.isFinite(customCurrent) && customCurrent > 0;
        // The money counts only while today is within the investment's
        // active window: on/after the start date, and on/before the end
        // date when one is set (no end date = still running).
        const sipEnd = parseDate(inv.endDate);
        const inWindow =
            today >= start && (sipEnd === null || today <= sipEnd);
        return {
            calculatedEndAmount: 0,
            customMaturityAmount: null,
            estimatedEndAmount: 0,
            currentValue:
                inWindow && hasCurrent ? round2(customCurrent) : 0,
            paidToDate: 0,
            interestToDate: 0,
            annualRate: 0,
            compounding: "none",
            totalMonths: 0,
            paidInstallments: Math.max(Math.floor(paidInstallments), 0),
            isCustomMaturity: false,
            isCustomCurrent: hasCurrent,
        };
    }

    let end = parseDate(inv.endDate);
    if (!end) {
        const termYears = Number(inv.termYears);
        if (Number.isFinite(termYears) && termYears > 0) {
            end = new Date(start);
            end.setFullYear(end.getFullYear() + termYears);
        }
    }
    if (!end || end <= start) return null;

    // A user-entered rate (percent) takes precedence over the type default.
    const customRate = Number(inv.interestRate);
    const rate =
        Number.isFinite(customRate) && customRate > 0
            ? customRate / 100
            : (DEFAULT_ANNUAL_RATES[type] ?? FALLBACK_RATE);
    const compounding = (inv.compounding || "monthly").toLowerCase();
    // A custom maturity amount overrides the calculated estimate.
    const customMaturity = Number(inv.customMaturityAmount);
    const isCustomMaturity =
        Number.isFinite(customMaturity) && customMaturity > 0;
    // A manually entered current amount overrides the calculated value.
    const customCurrent = Number(inv.currentAmount);
    const isCustomCurrent = Number.isFinite(customCurrent) && customCurrent > 0;
    const monthlyRate = effectiveMonthlyRate(rate, compounding);
    const totalMonths = Math.max(monthsBetween(start, end), 1);
    const elapsedMonths = Math.min(
        Math.max(monthsBetween(start, today), 0),
        totalMonths,
    );

    if (type === "FD") {
        const started = today >= start;
        const estimated = amount * Math.pow(1 + monthlyRate, totalMonths);
        const paidToDate = started ? amount : 0;
        const valueToday = started
            ? amount * Math.pow(1 + monthlyRate, elapsedMonths)
            : 0;
        return {
            calculatedEndAmount: round2(estimated),
            customMaturityAmount: isCustomMaturity
                ? round2(customMaturity)
                : null,
            estimatedEndAmount: isCustomMaturity
                ? round2(customMaturity)
                : round2(estimated),
            currentValue: isCustomCurrent
                ? round2(customCurrent)
                : round2(valueToday),
            paidToDate: round2(paidToDate),
            interestToDate: round2(Math.max(valueToday - paidToDate, 0)),
            annualRate: rate,
            compounding,
            totalMonths,
            paidInstallments: started ? 1 : 0,
            isCustomMaturity,
            isCustomCurrent,
        };
    }

    // SIP / RD (and anything else): monthly installment model.
    const checklistPaid = Math.floor(paidInstallments);
    // A manual paid-months count, when set, takes precedence over the
    // checklist-derived count.
    const manualPaid = Number(inv.paidMonths);
    const paid = Math.min(
        Math.max(
            Number.isFinite(manualPaid) && manualPaid >= 0
                ? Math.floor(manualPaid)
                : checklistPaid,
            0,
        ),
        totalMonths,
    );
    const remaining = totalMonths - paid;

    // Future value of `n` monthly installments of `amount`, valued at the
    // month of the last installment.
    const annuityFV = (n: number): number =>
        monthlyRate > 0
            ? amount * ((Math.pow(1 + monthlyRate, n) - 1) / monthlyRate)
            : amount * n;

    // Paid installments keep compounding until the end date.
    const paidValueToday = annuityFV(paid);
    const paidValueAtEnd =
        paidValueToday * Math.pow(1 + monthlyRate, remaining);
    const remainingValueAtEnd = annuityFV(remaining);

    const paidToDate = amount * paid;

    return {
        calculatedEndAmount: round2(paidValueAtEnd + remainingValueAtEnd),
        customMaturityAmount: isCustomMaturity ? round2(customMaturity) : null,
        estimatedEndAmount: isCustomMaturity
            ? round2(customMaturity)
            : round2(paidValueAtEnd + remainingValueAtEnd),
        currentValue: isCustomCurrent
            ? round2(customCurrent)
            : round2(paidValueToday),
        paidToDate: round2(paidToDate),
        interestToDate: round2(Math.max(paidValueToday - paidToDate, 0)),
        annualRate: rate,
        compounding,
        totalMonths,
        paidInstallments: paid,
        isCustomMaturity,
        isCustomCurrent,
    };
}
