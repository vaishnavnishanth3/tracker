import React, { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Chip from "@mui/material/Chip";
import type { InvestmentEstimate } from "../lib/investCalc";

type Inv = {
    id: string | number;
    name: string;
    type: string;
    startDate?: string;
    endDate?: string;
    amount?: string;
    estimate?: InvestmentEstimate | null;
};

type Check = {
    investmentId: string | number;
    month: number;
    year: number;
    done: boolean | string;
};

const MONTH_SHORT = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];

const TYPE_COLORS: Record<string, string> = {
    SIP: "#6366f1",
    RD: "#22c55e",
    FD: "#f59e0b",
};

// Distinct, pleasant palette for individual investments.
const INV_PALETTE = [
    "#6366f1", // indigo
    "#22c55e", // green
    "#f59e0b", // amber
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#a855f7", // purple
    "#ef4444", // red
    "#84cc16", // lime
    "#14b8a6", // teal
    "#f97316", // orange
    "#3b82f6", // blue
    "#eab308", // yellow
];

// Stable per-investment color derived from its id, so it survives reloads
// and stays consistent across years.
function colorFor(id: string | number, type?: string): string {
    const s = String(id);
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
    }
    return (
        INV_PALETTE[hash % INV_PALETTE.length] ??
        TYPE_COLORS[(type || "").toUpperCase()] ??
        "#94a3b8"
    );
}

// Pixel height of one month row in the grid.
const ROW_H = 46;
const HEADER_H = 56;

const fmt = (n: number): string =>
    n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

function parseDay(value?: string): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

// Convert a grid y offset to a 0-based month index within the year.
function yToMonthIndex(y: number): number {
    return Math.min(11, Math.max(0, Math.floor(y / ROW_H)));
}

function toISODate(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
}

type ResizeState = {
    id: string | number;
    edge: "start" | "end";
    startIdx: number; // 0-based month index at drag start
    endIdx: number;
    curStartIdx: number; // live preview while dragging
    curEndIdx: number;
};

export default function Calendar(): JSX.Element {
    const today = new Date();
    const [view, setView] = useState<"year" | "decade">("year");
    const [year, setYear] = useState<number>(today.getFullYear());
    const [investments, setInvestments] = useState<Inv[]>([]);
    const [checks, setChecks] = useState<Check[]>([]);
    const [resize, setResize] = useState<ResizeState | null>(null);
    const [dropTarget, setDropTarget] = useState<string | null>(null);
    const gridRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        fetch("/api/investments")
            .then((r) => r.json())
            .then(setInvestments);
        fetch("/api/checklist")
            .then((r) => r.json())
            .then(setChecks);
    }, []);

    const paidSet = useMemo(() => {
        const s = new Set<string>();
        for (const c of checks) {
            const done =
                c.done === true || String(c.done).toLowerCase() === "true";
            if (done) s.add(`${c.investmentId}-${c.year}-${c.month}`);
        }
        return s;
    }, [checks]);

    // Start year of the decade (10-year block) containing the selected year.
    const decadeStart = Math.floor(year / 10) * 10;
    const decadeYears = useMemo(
        () => Array.from({ length: 10 }, (_, i) => decadeStart + i),
        [decadeStart],
    );

    // Stable columns: every investment keeps its own column across years.
    const columns = investments;

    function activeInYear(inv: Inv, y: number): boolean {
        const start = parseDay(inv.startDate);
        if (!start) return false;
        const end = parseDay(inv.endDate) ?? null;
        return (
            start <= new Date(y, 11, 31) && (!end || end >= new Date(y, 0, 1))
        );
    }

    const yearInvestments = useMemo(
        () => columns.filter((inv) => activeInYear(inv, year)),
        [columns, year],
    );

    // 0-based month span of an investment clamped to the visible year.
    function spanOf(inv: Inv): { startIdx: number; endIdx: number } {
        const start = parseDay(inv.startDate)!;
        const end = parseDay(inv.endDate) ?? new Date(year, 11, 31);
        const s =
            start.getFullYear() < year ? 0 : Math.min(11, start.getMonth());
        const e = end.getFullYear() > year ? 11 : Math.max(0, end.getMonth());
        return { startIdx: s, endIdx: Math.max(e, s) };
    }

    // Persist a date change back to the Excel store, then refresh.
    async function saveDates(
        id: string | number,
        startDate: string,
        endDate: string,
    ) {
        await fetch("/api/investments", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id, startDate, endDate }),
        });
        const res = await fetch("/api/investments");
        setInvestments(await res.json());
    }

    // ---- resize (extend/shorten) interactions, like Teams/Google Calendar ----

    function beginResize(e: React.MouseEvent, inv: Inv, edge: "start" | "end") {
        // Calendar is view-only: resizing is disabled.
    }

    // Attach move/up listeners while a resize drag is active.
    useEffect(() => {
        if (!resize) return;

        function onMove(ev: MouseEvent) {
            const grid = gridRef.current;
            if (!grid) return;
            const rect = grid.getBoundingClientRect();
            const idx = yToMonthIndex(ev.clientY - rect.top);
            setResize((r) => {
                if (!r) return r;
                if (r.edge === "start") {
                    return { ...r, curStartIdx: Math.min(idx, r.curEndIdx) };
                }
                return { ...r, curEndIdx: Math.max(idx, r.curStartIdx) };
            });
        }

        function onUp() {
            setResize((r) => {
                if (!r) return null;
                if (r.curStartIdx !== r.startIdx || r.curEndIdx !== r.endIdx) {
                    const inv = investments.find(
                        (i) => String(i.id) === String(r.id),
                    );
                    if (inv) {
                        const origStart =
                            parseDay(inv.startDate) ?? new Date(year, 0, 1);
                        const origEnd =
                            parseDay(inv.endDate) ?? new Date(year, 11, 31);
                        const newStart =
                            r.curStartIdx === r.startIdx
                                ? origStart
                                : new Date(
                                      year,
                                      r.curStartIdx,
                                      Math.min(origStart.getDate(), 28),
                                  );
                        const newEnd =
                            r.curEndIdx === r.endIdx
                                ? origEnd
                                : new Date(
                                      year,
                                      r.curEndIdx,
                                      Math.min(origEnd.getDate(), 28),
                                  );
                        void saveDates(
                            r.id,
                            toISODate(newStart),
                            toISODate(newEnd),
                        );
                    }
                }
                return null;
            });
        }

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resize !== null]);

    // ---- move (drag block onto another investment column) ----

    async function onDrop(targetId: string | number, e: React.DragEvent) {
        // Calendar is view-only: drops are disabled.
    }

    const handleStyle: React.CSSProperties = {
        position: "absolute",
        left: 0,
        right: 0,
        height: 10,
        cursor: "ns-resize",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    };

    return (
        <Box>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mb: 2,
                    flexWrap: "wrap",
                }}
            >
                <Typography variant='h5' sx={{ flexGrow: 1 }}>
                    Investment Calendar
                </Typography>
                <ToggleButtonGroup
                    size='small'
                    exclusive
                    value={view}
                    onChange={(_, v) => v && setView(v)}
                >
                    <ToggleButton value='year'>Year</ToggleButton>
                    <ToggleButton value='decade'>10-Year</ToggleButton>
                </ToggleButtonGroup>
                <Button
                    onClick={() =>
                        setYear(view === "decade" ? year - 10 : year - 1)
                    }
                >
                    &larr;
                </Button>
                <Typography variant='h6'>
                    {view === "decade"
                        ? `${decadeStart} – ${decadeStart + 9}`
                        : year}
                </Typography>
                <Button
                    onClick={() =>
                        setYear(view === "decade" ? year + 10 : year + 1)
                    }
                >
                    &rarr;
                </Button>
                <Button
                    variant='outlined'
                    size='small'
                    onClick={() => setYear(today.getFullYear())}
                >
                    Today
                </Button>
            </Box>

            {view === "year" && (
                <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 2 }}
                >
                    View-only timeline: each investment keeps its own column;
                    colored blocks span its active months, dots mark paid
                    months. Manage dates and amounts in the Investments tab.
                </Typography>
            )}

            {view === "decade" && (
                <Box
                    sx={{
                        overflowX: "auto",
                        border: "1px solid rgba(148, 163, 184, 0.22)",
                        borderRadius: 2,
                        background: "rgba(15, 23, 42, 0.55)",
                        p: 2,
                    }}
                >
                    {/* Ten-year timeline: rows = years, bars = active investments */}
                    {decadeYears.map((y) => {
                        const active = investments.filter((inv) => {
                            const start = parseDay(inv.startDate);
                            if (!start) return false;
                            const end = parseDay(inv.endDate) ?? null;
                            return (
                                start <= new Date(y, 11, 31) &&
                                (!end || end >= new Date(y, 0, 1))
                            );
                        });
                        const total = active.reduce(
                            (s, inv) =>
                                s + (inv.estimate?.estimatedEndAmount ?? 0),
                            0,
                        );
                        const isCurrentYear = y === today.getFullYear();
                        return (
                            <Box
                                key={y}
                                onClick={() => {
                                    setYear(y);
                                    setView("year");
                                }}
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 2,
                                    py: 0.75,
                                    cursor: "pointer",
                                    borderRadius: 1,
                                    px: 1,
                                    "&:hover": {
                                        background: "rgba(99, 102, 241, 0.08)",
                                    },
                                }}
                                title={`Open ${y} in year view`}
                            >
                                <Typography
                                    variant='body2'
                                    sx={{
                                        width: 44,
                                        flexShrink: 0,
                                        fontWeight: isCurrentYear ? 700 : 400,
                                        color: isCurrentYear
                                            ? "primary.main"
                                            : "text.secondary",
                                    }}
                                >
                                    {y}
                                </Typography>
                                <Box
                                    sx={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 0.75,
                                        flexGrow: 1,
                                    }}
                                >
                                    {active.length === 0 && (
                                        <Typography
                                            variant='caption'
                                            color='text.secondary'
                                        >
                                            —
                                        </Typography>
                                    )}
                                    {active.map((inv) => {
                                        const color = colorFor(
                                            inv.id,
                                            inv.type,
                                        );
                                        const start = parseDay(inv.startDate)!;
                                        const end = parseDay(inv.endDate);
                                        const startsHere =
                                            start.getFullYear() === y;
                                        const endsHere =
                                            end?.getFullYear() === y;
                                        return (
                                            <Box
                                                key={String(inv.id)}
                                                title={`${inv.name} · ₹${fmt(Number(inv.amount) || 0)}/mo · ${inv.startDate} → ${inv.endDate || "open"} · Matures ₹${fmt(inv.estimate?.estimatedEndAmount ?? 0)}`}
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 0.75,
                                                    px: 1,
                                                    py: 0.25,
                                                    borderRadius: 1,
                                                    background: `${color}26`,
                                                    border: `1px solid ${color}`,
                                                    borderLeft: `4px solid ${color}`,
                                                }}
                                            >
                                                <Typography variant='caption'>
                                                    {inv.name}
                                                </Typography>
                                                {(startsHere || endsHere) && (
                                                    <Typography
                                                        variant='caption'
                                                        color='text.secondary'
                                                    >
                                                        {startsHere
                                                            ? "starts"
                                                            : ""}
                                                        {startsHere && endsHere
                                                            ? " · "
                                                            : ""}
                                                        {endsHere
                                                            ? `matures ₹${fmt(inv.estimate?.estimatedEndAmount ?? 0)}`
                                                            : ""}
                                                    </Typography>
                                                )}
                                            </Box>
                                        );
                                    })}
                                </Box>
                                {total > 0 && (
                                    <Typography
                                        variant='caption'
                                        color='text.secondary'
                                        sx={{ flexShrink: 0 }}
                                    >
                                        ≈ ₹{fmt(total)}
                                    </Typography>
                                )}
                            </Box>
                        );
                    })}
                </Box>
            )}

            {view === "year" &&
                (yearInvestments.length === 0 ? (
                    <Typography color='text.secondary'>
                        No investments active in {year}.
                    </Typography>
                ) : (
                    <Box
                        sx={{
                            overflowX: "auto",
                            border: "1px solid rgba(148, 163, 184, 0.22)",
                            borderRadius: 2,
                            background: "rgba(15, 23, 42, 0.55)",
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                minWidth: 110 + columns.length * 190,
                            }}
                        >
                            {/* Month gutter (like the hour column in Teams) */}
                            <Box sx={{ width: 110, flexShrink: 0 }}>
                                <Box sx={{ height: HEADER_H }} />
                                {MONTH_SHORT.map((m, idx) => {
                                    const isCurrent =
                                        year === today.getFullYear() &&
                                        idx === today.getMonth();
                                    return (
                                        <Box
                                            key={m}
                                            sx={{
                                                height: ROW_H,
                                                px: 1,
                                                display: "flex",
                                                alignItems: "flex-start",
                                                borderTop:
                                                    "1px solid rgba(148, 163, 184, 0.15)",
                                            }}
                                        >
                                            <Typography
                                                variant='caption'
                                                sx={{
                                                    fontWeight: isCurrent
                                                        ? 700
                                                        : 400,
                                                    color: isCurrent
                                                        ? "primary.main"
                                                        : "text.secondary",
                                                }}
                                            >
                                                {m}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Box>

                            {/* One fixed column per investment; blocks span active months */}
                            {columns.map((inv, colIdx) => {
                                const color = colorFor(inv.id, inv.type);
                                const isActive = activeInYear(inv, year);
                                const base = isActive
                                    ? spanOf(inv)
                                    : { startIdx: 0, endIdx: 0 };
                                const isResizing =
                                    resize !== null &&
                                    String(resize.id) === String(inv.id);
                                const span = isResizing
                                    ? {
                                          startIdx: resize.curStartIdx,
                                          endIdx: resize.curEndIdx,
                                      }
                                    : base;
                                const top = HEADER_H + span.startIdx * ROW_H;
                                const height =
                                    (span.endIdx - span.startIdx + 1) * ROW_H;
                                const key = String(inv.id);
                                return (
                                    <Box
                                        key={key}
                                        sx={{
                                            position: "relative",
                                            width: 190,
                                            flexShrink: 0,
                                            borderLeft:
                                                "1px solid rgba(148, 163, 184, 0.15)",
                                            opacity: isActive ? 1 : 0.35,
                                            background:
                                                dropTarget === key
                                                    ? "rgba(99, 102, 241, 0.10)"
                                                    : "transparent",
                                        }}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setDropTarget(key);
                                        }}
                                        onDragLeave={() =>
                                            setDropTarget((t) =>
                                                t === key ? null : t,
                                            )
                                        }
                                        onDrop={(e) => onDrop(inv.id, e)}
                                    >
                                        {/* Column header */}
                                        <Box
                                            sx={{
                                                height: HEADER_H,
                                                px: 1,
                                                py: 0.5,
                                                borderBottom:
                                                    "1px solid rgba(148, 163, 184, 0.22)",
                                            }}
                                        >
                                            <Typography
                                                variant='body2'
                                                noWrap
                                                title={inv.name}
                                                sx={{ fontWeight: 700 }}
                                            >
                                                {inv.name}
                                            </Typography>
                                            <Typography
                                                variant='caption'
                                                color='text.secondary'
                                            >
                                                {inv.type} · ₹
                                                {fmt(Number(inv.amount) || 0)}
                                                /mo
                                            </Typography>
                                        </Box>

                                        {/* Month grid lines; first column registers the measuring ref */}
                                        <Box
                                            ref={
                                                colIdx === 0
                                                    ? gridRef
                                                    : undefined
                                            }
                                        >
                                            {MONTH_SHORT.map((m) => (
                                                <Box
                                                    key={m}
                                                    sx={{
                                                        height: ROW_H,
                                                        borderTop:
                                                            "1px solid rgba(148, 163, 184, 0.08)",
                                                    }}
                                                />
                                            ))}
                                        </Box>

                                        {/* Event block spanning active months (view-only) */}
                                        {isActive && (
                                            <Box
                                                title={`${inv.name}\n${inv.startDate} → ${inv.endDate || "open"}\nEst. maturity: ₹${fmt(inv.estimate?.estimatedEndAmount ?? 0)}`}
                                                sx={{
                                                    position: "absolute",
                                                    top,
                                                    left: 6,
                                                    right: 6,
                                                    height: height - 4,
                                                    borderRadius: 1.5,
                                                    background: `${color}33`,
                                                    border: `1px solid ${color}`,
                                                    borderLeft: `4px solid ${color}`,
                                                    overflow: "hidden",
                                                    userSelect: "none",
                                                }}
                                            >
                                                <Box sx={{ px: 1, py: 1.5 }}>
                                                    <Typography
                                                        variant='caption'
                                                        sx={{
                                                            fontWeight: 700,
                                                            display: "block",
                                                            lineHeight: 1.3,
                                                        }}
                                                    >
                                                        {
                                                            MONTH_SHORT[
                                                                span.startIdx
                                                            ]
                                                        }{" "}
                                                        →{" "}
                                                        {
                                                            MONTH_SHORT[
                                                                span.endIdx
                                                            ]
                                                        }{" "}
                                                        {year}
                                                    </Typography>
                                                    <Typography
                                                        variant='caption'
                                                        color='text.secondary'
                                                        sx={{
                                                            display: "block",
                                                        }}
                                                    >
                                                        Matures ₹
                                                        {fmt(
                                                            inv.estimate
                                                                ?.estimatedEndAmount ??
                                                                0,
                                                        )}
                                                    </Typography>
                                                </Box>

                                                {/* per-month paid/pending dots */}
                                                <Box
                                                    sx={{
                                                        position: "absolute",
                                                        top: 10,
                                                        bottom: 10,
                                                        right: 8,
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        justifyContent:
                                                            "space-between",
                                                    }}
                                                >
                                                    {Array.from(
                                                        {
                                                            length:
                                                                span.endIdx -
                                                                span.startIdx +
                                                                1,
                                                        },
                                                        (_, i) => {
                                                            const m =
                                                                span.startIdx +
                                                                i +
                                                                1;
                                                            const paid =
                                                                paidSet.has(
                                                                    `${inv.id}-${year}-${m}`,
                                                                );
                                                            return (
                                                                <Box
                                                                    key={m}
                                                                    title={`${MONTH_SHORT[m - 1]} ${year}: ${paid ? "paid" : "pending"}`}
                                                                    sx={{
                                                                        width: 8,
                                                                        height: 8,
                                                                        borderRadius:
                                                                            "50%",
                                                                        background:
                                                                            paid
                                                                                ? "#22c55e"
                                                                                : "rgba(148, 163, 184, 0.45)",
                                                                    }}
                                                                />
                                                            );
                                                        },
                                                    )}
                                                </Box>
                                            </Box>
                                        )}
                                        {!isActive && (
                                            <Box
                                                sx={{
                                                    position: "absolute",
                                                    top: HEADER_H + 8,
                                                    left: 0,
                                                    right: 0,
                                                    textAlign: "center",
                                                }}
                                            >
                                                <Typography
                                                    variant='caption'
                                                    color='text.secondary'
                                                >
                                                    not active in {year}
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                ))}

            <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                {Object.entries(TYPE_COLORS).map(([t, c]) => (
                    <Chip
                        key={t}
                        label={t}
                        size='small'
                        sx={{ background: `${c}33`, border: `1px solid ${c}` }}
                    />
                ))}
                <Chip
                    label='● paid'
                    size='small'
                    sx={{ color: "#22c55e" }}
                    variant='outlined'
                />
                <Chip
                    label='● pending'
                    size='small'
                    sx={{ color: "#94a3b8" }}
                    variant='outlined'
                />
            </Box>
        </Box>
    );
}
