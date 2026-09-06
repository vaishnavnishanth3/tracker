import React, { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";

type Payslip = {
    id: string | number;
    date: string;
    gross?: string | number;
    basic?: string | number;
    hra?: string | number;
    allowances?: string | number;
    deductions?: string | number;
    net?: string | number;
    notes?: string;
    expectedIncome?: string | number;
};

const fmt = (n: number): string =>
    n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

// Displayed value for a numeric field: raw input while editing, stored value otherwise.
function fieldVal(
    form: Record<string, string>,
    key: string,
    existing?: Payslip,
): string {
    if (form[key] !== undefined && form[key] !== "") return form[key];
    if (form[key] === "") return "";
    return String(existing?.[key as keyof Payslip] ?? "");
}

export default function Payslips(): JSX.Element {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [items, setItems] = useState<Payslip[]>([]);
    const [month, setMonth] = useState<string>(defaultMonth);
    // Editable fields keyed by component name; undefined = untouched.
    const [form, setForm] = useState<Record<string, string>>({});
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetch("/api/payslips")
            .then((r) => r.json())
            .then(setItems);
    }, []);

    // Payslip recorded for the selected month (date stored as YYYY-MM-DD).
    const existing: Payslip | undefined = useMemo(
        () => items.find((it) => String(it.date).startsWith(month)),
        [items, month],
    );

    // Reset the editor to the selected month's stored values.
    useEffect(() => {
        setForm({});
        setSaved(false);
    }, [month]);

    const value = (key: string): string =>
        key in form
            ? form[key]
            : String(existing?.[key as keyof Payslip] ?? "");

    const num = (key: string): number => Number(value(key)) || 0;
    const net = num("gross") - num("deductions");
    const expected = num("expectedIncome");
    const diff = expected - net;

    // Total income for the financial year (Apr-Mar) of the selected month.
    const fyStartYear =
        Number(month.slice(5, 7)) >= 4
            ? Number(month.slice(0, 4))
            : Number(month.slice(0, 4)) - 1;
    const fyLabel = `FY ${fyStartYear}-${String((fyStartYear + 1) % 100).padStart(2, "0")}`;
    const fyItems = items.filter((it) => {
        const d = new Date(String(it.date));
        if (isNaN(d.getTime())) return false;
        const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
        return y === fyStartYear;
    });
    const fyGross = fyItems.reduce((s, it) => s + (Number(it.gross) || 0), 0);
    const fyNet = fyItems.reduce((s, it) => s + (Number(it.net) || 0), 0);

    async function save() {
        const payload = {
            date: existing ? existing.date : `${month}-28`,
            gross: num("gross"),
            basic: num("basic"),
            hra: num("hra"),
            allowances: num("allowances"),
            deductions: num("deductions"),
            net,
            notes: value("notes"),
        };
        if (existing) {
            await fetch("/api/payslips", {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    id: existing.id,
                    ...payload,
                    expectedIncome: value("expectedIncome"),
                }),
            });
        } else {
            await fetch("/api/payslips", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    ...payload,
                    expectedIncome: value("expectedIncome"),
                }),
            });
        }
        setItems(await (await fetch("/api/payslips")).json());
        setSaved(true);
    }

    const rows: {
        key: string;
        label: string;
        color?: string;
        numeric: boolean;
    }[] = [
        { key: "gross", label: "Gross", color: "#6366f1", numeric: true },
        { key: "basic", label: "Basic", color: "#2563eb", numeric: true },
        { key: "hra", label: "HRA", color: "#059669", numeric: true },
        {
            key: "allowances",
            label: "Allowances",
            color: "#d97706",
            numeric: true,
        },
        {
            key: "deductions",
            label: "Deductions",
            color: "#ef4444",
            numeric: true,
        },
        {
            key: "expectedIncome",
            label: "Expected Income",
            color: "#a855f7",
            numeric: true,
        },
        { key: "notes", label: "Notes", numeric: false },
    ];

    return (
        <Box>
            <Typography variant='h5' gutterBottom>
                Payslip Breaker
            </Typography>

            <Box
                sx={{
                    display: "flex",
                    gap: 3,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                }}
            >
                {/* Left: month picker + saved list */}
                <Box sx={{ minWidth: 260, flexShrink: 0 }}>
                    <TextField
                        type='month'
                        label='Month'
                        InputLabelProps={{ shrink: true }}
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        fullWidth
                    />
                    <Typography variant='subtitle2' sx={{ mt: 3, mb: 1 }}>
                        Saved months
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {items
                            .slice()
                            .sort((a, b) =>
                                String(b.date).localeCompare(String(a.date)),
                            )
                            .map((it) => (
                                <Chip
                                    key={String(it.id)}
                                    label={String(it.date).slice(0, 7)}
                                    variant={
                                        String(it.date).startsWith(month)
                                            ? "filled"
                                            : "outlined"
                                    }
                                    color={
                                        String(it.date).startsWith(month)
                                            ? "primary"
                                            : "default"
                                    }
                                    onClick={() =>
                                        setMonth(String(it.date).slice(0, 7))
                                    }
                                    title={`Net: ₹${fmt(Number(it.net) || 0)}`}
                                />
                            ))}
                        {items.length === 0 && (
                            <Typography
                                variant='caption'
                                color='text.secondary'
                            >
                                Nothing saved yet.
                            </Typography>
                        )}
                    </Box>
                </Box>

                {/* Right: entry table for the selected month */}
                <Box
                    sx={{
                        flexGrow: 1,
                        minWidth: 360,
                        border: "1px solid rgba(148, 163, 184, 0.22)",
                        borderRadius: 2,
                        overflow: "hidden",
                    }}
                >
                    <Box
                        sx={{
                            px: 2,
                            py: 1.5,
                            borderBottom: "1px solid rgba(148, 163, 184, 0.22)",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                        }}
                    >
                        <Typography variant='subtitle1' sx={{ flexGrow: 1 }}>
                            {month}
                        </Typography>
                        {existing && (
                            <Chip
                                label='saved'
                                size='small'
                                color='success'
                                variant='outlined'
                            />
                        )}
                        {saved && (
                            <Typography
                                variant='caption'
                                sx={{ color: "#22c55e" }}
                            >
                                Saved ✓
                            </Typography>
                        )}
                    </Box>

                    <Table size='small'>
                        <TableBody>
                            {rows.map((r) => (
                                <TableRow key={r.key}>
                                    <TableCell sx={{ width: 160 }}>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1,
                                            }}
                                        >
                                            {r.color && (
                                                <Box
                                                    sx={{
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: "50%",
                                                        background: r.color,
                                                    }}
                                                />
                                            )}
                                            {r.label}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            size='small'
                                            fullWidth
                                            type={r.numeric ? "number" : "text"}
                                            inputProps={
                                                r.numeric
                                                    ? { min: 0, step: "any" }
                                                    : undefined
                                            }
                                            value={value(r.key)}
                                            onChange={(e) => {
                                                setForm({
                                                    ...form,
                                                    [r.key]: e.target.value,
                                                });
                                                setSaved(false);
                                            }}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>
                                    Net
                                </TableCell>
                                <TableCell>
                                    <Typography
                                        sx={{
                                            fontWeight: 700,
                                            color:
                                                net >= 0
                                                    ? "#22c55e"
                                                    : "#ef4444",
                                        }}
                                    >
                                        ₹{fmt(net)}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>
                                    Difference
                                </TableCell>
                                <TableCell>
                                    <Typography
                                        sx={{
                                            fontWeight: 700,
                                            color:
                                                diff >= 0
                                                    ? "#22c55e"
                                                    : "#ef4444",
                                        }}
                                        title='Expected Income − Net'
                                    >
                                        {diff >= 0 ? "+" : "−"}₹
                                        {fmt(Math.abs(diff))}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>

                    {/* composition bar */}
                    <Box sx={{ px: 2, py: 1.5 }}>
                        <Box
                            sx={{
                                display: "flex",
                                height: 20,
                                width: "100%",
                                borderRadius: 1,
                                overflow: "hidden",
                                bgcolor: "rgba(148, 163, 184, 0.12)",
                            }}
                        >
                            {[
                                { v: num("basic"), c: "#2563eb", k: "Basic" },
                                { v: num("hra"), c: "#059669", k: "HRA" },
                                {
                                    v: num("allowances"),
                                    c: "#d97706",
                                    k: "Allowances",
                                },
                                {
                                    v: num("deductions"),
                                    c: "#ef4444",
                                    k: "Deductions",
                                },
                            ].map((p) => (
                                <Box
                                    key={p.k}
                                    title={`${p.k}: ₹${fmt(p.v)}`}
                                    sx={{
                                        width: `${(p.v / Math.max(num("gross"), 1)) * 100}%`,
                                        background: p.c,
                                    }}
                                />
                            ))}
                        </Box>
                        <Button
                            variant='contained'
                            sx={{ mt: 2 }}
                            onClick={save}
                            disabled={num("gross") <= 0}
                        >
                            {existing ? "Update" : "Save"} {month}
                        </Button>
                    </Box>
                </Box>

                {/* Right: FY income summary */}
                <Box
                    sx={{
                        width: 240,
                        flexShrink: 0,
                        border: "1px solid rgba(148, 163, 184, 0.22)",
                        borderRadius: 2,
                        p: 2,
                    }}
                >
                    <Typography variant='subtitle2' gutterBottom>
                        {fyLabel} income
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                        {fyItems.length} payslip(s) recorded
                    </Typography>
                    <Typography sx={{ mt: 1.5 }} variant='body2'>
                        Gross
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>
                        ₹{fmt(fyGross)}
                    </Typography>
                    <Typography sx={{ mt: 1.5 }} variant='body2'>
                        Net take-home
                    </Typography>
                    <Typography sx={{ fontWeight: 700, color: "#22c55e" }}>
                        ₹{fmt(fyNet)}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}
