import React, { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

type Exp = {
    id: string | number;
    date: string;
    category: string;
    amount: number;
    description?: string;
};

type Earning = {
    id: string | number;
    date: string;
    earned?: number;
    tax?: number;
    notes?: string;
};

type SummaryBucket = {
    label: string;
    earned: number;
    spent: number;
    returned: number;
    tax: number;
    net: number;
};

type Summary = {
    generatedAt: string;
    fourMonths: SummaryBucket[];
    years: SummaryBucket[];
    months: SummaryBucket[];
};

const fmt = (n: number): string =>
    n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

type Epf = {
    id: string | number;
    month: number;
    year: number;
    employee?: number;
    employer?: number;
    notes?: string;
};

const PIE_COLORS = [
    "#6366f1",
    "#22c55e",
    "#f59e0b",
    "#ec4899",
    "#06b6d4",
    "#a855f7",
    "#ef4444",
    "#84cc16",
    "#14b8a6",
    "#f97316",
    "#3b82f6",
    "#eab308",
];

export default function Expenses(): JSX.Element {
    const [items, setItems] = useState<Exp[]>([]);
    const [balances, setBalances] = useState<any[]>([]);
    const [earnings, setEarnings] = useState<Earning[]>([]);
    const [epfRows, setEpfRows] = useState<Epf[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [form, setForm] = useState({
        date: "",
        category: "",
        amount: "",
        description: "",
    });
    const [earnForm, setEarnForm] = useState({
        date: "",
        earned: "",
        tax: "",
        notes: "",
    });
    const [epfForm, setEpfForm] = useState({
        month: "",
        year: "",
        employee: "",
        employer: "",
        notes: "",
    });
    // Pie-chart view selection.
    const [view, setView] = useState<"day" | "month" | "year">("month");
    const [viewDate, setViewDate] = useState<string>(""); // day
    const [viewMonth, setViewMonth] = useState<string>(""); // yyyy-mm
    const [viewYear, setViewYear] = useState<string>(""); // yyyy

    function refreshAll() {
        fetch("/api/expenses")
            .then((r) => r.json())
            .then(setItems);
        fetch("/api/balances")
            .then((r) => r.json())
            .then(setBalances);
        fetch("/api/earnings")
            .then((r) => r.json())
            .then(setEarnings);
        fetch("/api/epf")
            .then((r) => r.json())
            .then(setEpfRows);
        fetch("/api/summary")
            .then((r) => r.json())
            .then(setSummary);
    }

    useEffect(() => {
        refreshAll();
    }, []);

    async function add(e: React.FormEvent) {
        e.preventDefault();
        await fetch("/api/expenses", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(form),
        });
        setForm({ date: "", category: "", amount: "", description: "" });
        refreshAll();
    }

    async function addEarning(e: React.FormEvent) {
        e.preventDefault();
        await fetch("/api/earnings", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(earnForm),
        });
        setEarnForm({ date: "", earned: "", tax: "", notes: "" });
        refreshAll();
    }

    async function addEpf(e: React.FormEvent) {
        e.preventDefault();
        await fetch("/api/epf", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(epfForm),
        });
        setEpfForm({
            month: "",
            year: "",
            employee: "",
            employer: "",
            notes: "",
        });
        refreshAll();
    }

    // Parse a date from the sheet (string or Excel date serial) safely.
    const parseLooseDate = (value?: string): Date | null => {
        if (!value) return null;
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
    };

    // Everything recorded on the date the user picked.
    const sameDay = (a?: string, b?: string): boolean => {
        if (!a || !b) return false;
        const da = new Date(a);
        const db = new Date(b);
        if (isNaN(da.getTime()) || isNaN(db.getTime())) return false;
        return (
            da.getFullYear() === db.getFullYear() &&
            da.getMonth() === db.getMonth() &&
            da.getDate() === db.getDate()
        );
    };
    const dayExpenses = selectedDate
        ? items.filter((it) => sameDay(it.date, selectedDate))
        : [];
    const dayEarnings = selectedDate
        ? earnings.filter((it) => sameDay(it.date, selectedDate))
        : [];
    const daySpent = dayExpenses.reduce((s, it) => s + (Number(it.amount) || 0), 0);
    const dayEarned = dayEarnings.reduce((s, it) => s + (Number(it.earned) || 0), 0);
    const dayTax = dayEarnings.reduce((s, it) => s + (Number(it.tax) || 0), 0);

    // ---- Pie chart of expenses, scoped by the Day / Month / Year picker ----
    const pieData = useMemo(() => {
        const inScope = (dateStr?: string): boolean => {
            const d = parseLooseDate(dateStr);
            if (!d) return false;
            if (view === "day") {
                return viewDate ? sameDay(dateStr, viewDate) : false;
            }
            if (view === "month") {
                if (!viewMonth) return false;
                const [y, m] = viewMonth.split("-").map(Number);
                return d.getFullYear() === y && d.getMonth() + 1 === m;
            }
            // year
            if (!viewYear) return false;
            return d.getFullYear() === Number(viewYear);
        };
        const byCategory = new Map<string, number>();
        for (const it of items) {
            if (!inScope(it.date)) continue;
            const cat = it.category?.trim() || "Uncategorized";
            byCategory.set(
                cat,
                (byCategory.get(cat) ?? 0) + (Number(it.amount) || 0),
            );
        }
        return [...byCategory.entries()]
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [items, view, viewDate, viewMonth, viewYear]);

    const pieTotal = pieData.reduce((s, d) => s + d.value, 0);
    const pieScopeLabel =
        view === "day"
            ? viewDate || "pick a date"
            : view === "month"
              ? viewMonth || "pick a month"
              : viewYear || "pick a year";
    async function addBalance(e: React.FormEvent) {
        e.preventDefault();
        const target = e.target as HTMLFormElement;
        const b = {
            month: (target.month as HTMLInputElement).value,
            year: (target.year as HTMLInputElement).value,
            balance: (target.balance as HTMLInputElement).value,
        };
        await fetch("/api/balances", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(b),
        });
        setBalances(await (await fetch("/api/balances")).json());
    }
    return (
        <Box>
            <Typography variant='h5'>Expenses</Typography>
            <Box
                component='form'
                onSubmit={addBalance}
                sx={{ display: "flex", gap: 2, my: 2 }}
            >
                <TextField
                    name='month'
                    type='number'
                    label='Month'
                    inputProps={{ min: 1, max: 12 }}
                    required
                />
                <TextField name='year' type='number' label='Year' required />
                <TextField
                    name='balance'
                    type='number'
                    label='Balance'
                    required
                />
                <Button type='submit' variant='contained'>
                    Add Balance
                </Button>
            </Box>
            <Table sx={{ mb: 3 }}>
                <TableHead>
                    <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Month</TableCell>
                        <TableCell>Year</TableCell>
                        <TableCell>Balance</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {balances.map((b) => (
                        <TableRow key={String(b.id)}>
                            <TableCell>{b.id}</TableCell>
                            <TableCell>{b.month}</TableCell>
                            <TableCell>{b.year}</TableCell>
                            <TableCell>{b.balance}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Typography variant='h6'>Add Expense</Typography>
            <Box
                component='form'
                onSubmit={add}
                sx={{ display: "flex", gap: 2, my: 2 }}
            >
                <TextField
                    type='date'
                    label='Date'
                    InputLabelProps={{ shrink: true }}
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                />
                <TextField
                    label='Category'
                    value={form.category}
                    onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                    }
                />
                <TextField
                    type='number'
                    label='Amount'
                    value={form.amount}
                    onChange={(e) =>
                        setForm({ ...form, amount: e.target.value })
                    }
                    required
                />
                <TextField
                    label='Description'
                    value={form.description}
                    onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                    }
                />
                <Button type='submit' variant='contained'>
                    Add
                </Button>
            </Box>

            <Typography variant='h6'>Add Earning / Income Tax</Typography>
            <Box
                component='form'
                onSubmit={addEarning}
                sx={{ display: "flex", gap: 2, my: 2, flexWrap: "wrap" }}
            >
                <TextField
                    type='date'
                    label='Date'
                    InputLabelProps={{ shrink: true }}
                    value={earnForm.date}
                    onChange={(e) =>
                        setEarnForm({ ...earnForm, date: e.target.value })
                    }
                    required
                />
                <TextField
                    type='number'
                    label='Earned (₹)'
                    inputProps={{ min: 0, step: "any" }}
                    value={earnForm.earned}
                    onChange={(e) =>
                        setEarnForm({ ...earnForm, earned: e.target.value })
                    }
                />
                <TextField
                    type='number'
                    label='Income Tax Paid (₹)'
                    inputProps={{ min: 0, step: "any" }}
                    value={earnForm.tax}
                    onChange={(e) =>
                        setEarnForm({ ...earnForm, tax: e.target.value })
                    }
                />
                <TextField
                    label='Notes'
                    value={earnForm.notes}
                    onChange={(e) =>
                        setEarnForm({ ...earnForm, notes: e.target.value })
                    }
                />
                <Button type='submit' variant='contained'>
                    Add
                </Button>
            </Box>

            <Typography variant='h6' sx={{ mt: 3 }}>
                View a specific date
            </Typography>
            <Box sx={{ display: "flex", gap: 2, my: 2, alignItems: "center" }}>
                <TextField
                    type='date'
                    label='Date'
                    InputLabelProps={{ shrink: true }}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                />
                {selectedDate && (
                    <Typography variant='body2'>
                        Earned ₹{fmt(dayEarned)} · Spent ₹{fmt(daySpent)} · Tax
                        ₹{fmt(dayTax)}
                    </Typography>
                )}
            </Box>
            {selectedDate && (
                <Table sx={{ mb: 3 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell>Kind</TableCell>
                            <TableCell>Details</TableCell>
                            <TableCell align='right'>Amount (₹)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {dayExpenses.length === 0 &&
                            dayEarnings.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3}>
                                        Nothing recorded on this date.
                                    </TableCell>
                                </TableRow>
                            )}
                        {dayEarnings.map((it) => (
                            <TableRow key={`e-${String(it.id)}`}>
                                <TableCell>Earning</TableCell>
                                <TableCell>{it.notes || "-"}</TableCell>
                                <TableCell align='right'>
                                    {fmt(Number(it.earned) || 0)}
                                    {Number(it.tax)
                                        ? ` (tax ${fmt(Number(it.tax))})`
                                        : ""}
                                </TableCell>
                            </TableRow>
                        ))}
                        {dayExpenses.map((it) => (
                            <TableRow key={`x-${String(it.id)}`}>
                                <TableCell>Expense</TableCell>
                                <TableCell>
                                    {it.category}
                                    {it.description
                                        ? ` — ${it.description}`
                                        : ""}
                                </TableCell>
                                <TableCell align='right'>
                                    {fmt(Number(it.amount) || 0)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            <Typography variant='h6' sx={{ mt: 3 }}>
                Expense breakdown
            </Typography>
            <Box
                sx={{
                    display: "flex",
                    gap: 2,
                    my: 2,
                    alignItems: "center",
                    flexWrap: "wrap",
                }}
            >
                <TextField
                    select
                    label='View'
                    value={view}
                    onChange={(e) =>
                        setView(e.target.value as "day" | "month" | "year")
                    }
                    sx={{ minWidth: 120 }}
                >
                    <MenuItem value='day'>Day</MenuItem>
                    <MenuItem value='month'>Month</MenuItem>
                    <MenuItem value='year'>Year</MenuItem>
                </TextField>
                {view === "day" && (
                    <TextField
                        type='date'
                        label='Date'
                        InputLabelProps={{ shrink: true }}
                        value={viewDate}
                        onChange={(e) => setViewDate(e.target.value)}
                    />
                )}
                {view === "month" && (
                    <TextField
                        type='month'
                        label='Month'
                        InputLabelProps={{ shrink: true }}
                        value={viewMonth}
                        onChange={(e) => setViewMonth(e.target.value)}
                    />
                )}
                {view === "year" && (
                    <TextField
                        type='number'
                        label='Year'
                        inputProps={{ min: 1970, max: 2100 }}
                        value={viewYear}
                        onChange={(e) => setViewYear(e.target.value)}
                        sx={{ width: 120 }}
                    />
                )}
                <Typography variant='body2' color='text.secondary'>
                    Total: ₹{fmt(pieTotal)} ({pieScopeLabel})
                </Typography>
            </Box>
            {pieData.length > 0 ? (
                <Box sx={{ width: "100%", height: 320, mb: 3 }}>
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie
                                data={pieData}
                                dataKey='value'
                                nameKey='name'
                                cx='50%'
                                cy='50%'
                                outerRadius={110}
                                label={(p) =>
                                    `${p.name} ₹${fmt(p.value as number)}`
                                }
                            >
                                {pieData.map((d, i) => (
                                    <Cell
                                        key={d.name}
                                        fill={
                                            PIE_COLORS[i % PIE_COLORS.length]
                                        }
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(v: any) => `₹${fmt(Number(v))}`}
                            />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </Box>
            ) : (
                <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
                    No expenses in this {view}. Pick a {view} above to see the
                    breakdown.
                </Typography>
            )}

            <Typography variant='h6' sx={{ mt: 3 }}>
                Summary — last 4 months
            </Typography>
            <Table sx={{ mb: 3 }}>
                <TableHead>
                    <TableRow>
                        <TableCell>Month</TableCell>
                        <TableCell align='right'>Earned (₹)</TableCell>
                        <TableCell align='right'>Spent (₹)</TableCell>
                        <TableCell align='right'>Returned (₹)</TableCell>
                        <TableCell align='right'>Income Tax (₹)</TableCell>
                        <TableCell align='right'>Net (₹)</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(summary?.fourMonths ?? []).map((b) => (
                        <TableRow key={b.label}>
                            <TableCell>{b.label}</TableCell>
                            <TableCell align='right'>{fmt(b.earned)}</TableCell>
                            <TableCell align='right'>{fmt(b.spent)}</TableCell>
                            <TableCell align='right'>{fmt(b.returned)}</TableCell>
                            <TableCell align='right'>{fmt(b.tax)}</TableCell>
                            <TableCell
                                align='right'
                                sx={{
                                    fontWeight: "bold",
                                    color:
                                        b.net < 0 ? "error.main" : "inherit",
                                }}
                            >
                                {fmt(b.net)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Typography variant='h6'>Summary — by year</Typography>
            <Table sx={{ mb: 3 }}>
                <TableHead>
                    <TableRow>
                        <TableCell>Year</TableCell>
                        <TableCell align='right'>Earned (₹)</TableCell>
                        <TableCell align='right'>Spent (₹)</TableCell>
                        <TableCell align='right'>Returned (₹)</TableCell>
                        <TableCell align='right'>Income Tax (₹)</TableCell>
                        <TableCell align='right'>Net (₹)</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(summary?.years ?? []).map((b) => (
                        <TableRow key={b.label}>
                            <TableCell>{b.label}</TableCell>
                            <TableCell align='right'>{fmt(b.earned)}</TableCell>
                            <TableCell align='right'>{fmt(b.spent)}</TableCell>
                            <TableCell align='right'>{fmt(b.returned)}</TableCell>
                            <TableCell align='right'>{fmt(b.tax)}</TableCell>
                            <TableCell
                                align='right'
                                sx={{
                                    fontWeight: "bold",
                                    color:
                                        b.net < 0 ? "error.main" : "inherit",
                                }}
                            >
                                {fmt(b.net)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Typography variant='h6' sx={{ mt: 3 }}>
                EPF — monthly details
            </Typography>
            <Box
                component='form'
                onSubmit={addEpf}
                sx={{ display: "flex", gap: 2, my: 2, flexWrap: "wrap" }}
            >
                <TextField
                    name='month'
                    type='number'
                    label='Month'
                    inputProps={{ min: 1, max: 12 }}
                    value={epfForm.month}
                    onChange={(e) =>
                        setEpfForm({ ...epfForm, month: e.target.value })
                    }
                    required
                />
                <TextField
                    name='year'
                    type='number'
                    label='Year'
                    value={epfForm.year}
                    onChange={(e) =>
                        setEpfForm({ ...epfForm, year: e.target.value })
                    }
                    required
                />
                <TextField
                    type='number'
                    label='Employee share (₹)'
                    inputProps={{ min: 0, step: "any" }}
                    value={epfForm.employee}
                    onChange={(e) =>
                        setEpfForm({ ...epfForm, employee: e.target.value })
                    }
                />
                <TextField
                    type='number'
                    label='Employer share (₹)'
                    inputProps={{ min: 0, step: "any" }}
                    value={epfForm.employer}
                    onChange={(e) =>
                        setEpfForm({ ...epfForm, employer: e.target.value })
                    }
                />
                <TextField
                    label='Notes'
                    value={epfForm.notes}
                    onChange={(e) =>
                        setEpfForm({ ...epfForm, notes: e.target.value })
                    }
                />
                <Button type='submit' variant='contained'>
                    Add
                </Button>
            </Box>
            <Table sx={{ mb: 3 }}>
                <TableHead>
                    <TableRow>
                        <TableCell>Month</TableCell>
                        <TableCell>Year</TableCell>
                        <TableCell align='right'>Employee (₹)</TableCell>
                        <TableCell align='right'>Employer (₹)</TableCell>
                        <TableCell align='right'>Total (₹)</TableCell>
                        <TableCell>Notes</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {epfRows.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6}>
                                No EPF entries yet. Add one for each month
                                above.
                            </TableCell>
                        </TableRow>
                    )}
                    {epfRows.map((r) => {
                        const emp = Number(r.employee) || 0;
                        const empr = Number(r.employer) || 0;
                        return (
                            <TableRow key={String(r.id)}>
                                <TableCell>{r.month}</TableCell>
                                <TableCell>{r.year}</TableCell>
                                <TableCell align='right'>{fmt(emp)}</TableCell>
                                <TableCell align='right'>{fmt(empr)}</TableCell>
                                <TableCell align='right'>
                                    {fmt(emp + empr)}
                                </TableCell>
                                <TableCell>{r.notes}</TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            <Typography variant='h6'>All</Typography>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Description</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {items.map((it) => (
                        <TableRow key={String(it.id)}>
                            <TableCell>{it.id}</TableCell>
                            <TableCell>{it.date}</TableCell>
                            <TableCell>{it.category}</TableCell>
                            <TableCell>{it.amount}</TableCell>
                            <TableCell>{it.description}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    );
}
