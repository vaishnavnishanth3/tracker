import React, { useEffect, useState } from "react";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import type { InvestmentEstimate } from "../lib/investCalc";

const PencilIcon = (): JSX.Element => (
    <svg
        width='16'
        height='16'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
        aria-hidden='true'
    >
        <path d='M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z' />
    </svg>
);

const TrashIcon = (): JSX.Element => (
    <svg
        width='16'
        height='16'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
        aria-hidden='true'
    >
        <path d='M3 6h18' />
        <path d='M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' />
        <path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' />
        <path d='M10 11v6' />
        <path d='M14 11v6' />
    </svg>
);

const CopyIcon = (): JSX.Element => (
    <svg
        width='14'
        height='14'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
        aria-hidden='true'
    >
        <rect x='9' y='9' width='13' height='13' rx='2' />
        <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' />
    </svg>
);

type Inv = {
    id: string | number;
    name: string;
    type: string;
    startDate?: string;
    endDate?: string;
    amount?: string;
    currentAmount?: string | number;
    estimate?: InvestmentEstimate | null;
};

const fmt = (n: number): string =>
    n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

// Same palette as the calendar so an investment keeps its color everywhere.
const INV_PALETTE = [
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

function colorFor(id: string | number): string {
    const s = String(id);
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
    }
    return INV_PALETTE[hash % INV_PALETTE.length];
}

type StatusInfo = {
    label: "Upcoming" | "In Progress" | "Completed" | "Matured";
    color: "info" | "warning" | "success";
};

// Status from the investment's dates relative to today.
function statusOf(inv: Inv, today = new Date()): StatusInfo {
    const start = inv.startDate ? new Date(inv.startDate) : null;
    const end = inv.endDate ? new Date(inv.endDate) : null;
    if (start && !isNaN(start.getTime()) && today < start) {
        return { label: "Upcoming", color: "info" };
    }
    if (end && !isNaN(end.getTime()) && today > end) {
        // "Completed" when every scheduled installment was paid, else "Matured".
        const full =
            inv.estimate !== null &&
            inv.estimate !== undefined &&
            inv.estimate.paidInstallments >= inv.estimate.totalMonths;
        return {
            label: full ? "Completed" : "Matured",
            color: "success",
        };
    }
    return { label: "In Progress", color: "warning" };
}

export default function Investments(): JSX.Element {
    const [items, setItems] = useState<Inv[]>([]);
    const [form, setForm] = useState({
        name: "",
        type: "SIP",
        startDate: "",
        endDate: "",
        amount: "",
        compounding: "monthly",
        interestRate: "",
        customMaturityAmount: "",
    });
    const [editingId, setEditingId] = useState<string | number | null>(null);
    const [editingValue, setEditingValue] = useState("");
    const [editingCurrentId, setEditingCurrentId] = useState<
        string | number | null
    >(null);
    const [editingCurrentValue, setEditingCurrentValue] = useState("");
    const [editingDate, setEditingDate] = useState<{
        id: string | number;
        field: "startDate" | "endDate";
    } | null>(null);
    const [editingDateValue, setEditingDateValue] = useState("");

    useEffect(() => {
        fetch("/api/investments")
            .then((r) => r.json())
            .then(setItems);
    }, []);

    async function add(e: React.FormEvent) {
        e.preventDefault();
        await fetch("/api/investments", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(form),
        });
        const res = await fetch("/api/investments");
        setItems(await res.json());
    }

    async function remove(id: string | number) {
        if (!window.confirm("Delete this investment?")) return;
        await fetch(`/api/investments?id=${encodeURIComponent(String(id))}`, {
            method: "DELETE",
        });
        const res = await fetch("/api/investments");
        setItems(await res.json());
    }

    async function saveCustomMaturity(id: string | number, raw: string) {
        const value = raw.trim();
        await fetch("/api/investments", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                id,
                customMaturityAmount: value === "" ? "" : Number(value),
            }),
        });
        const res = await fetch("/api/investments");
        setItems(await res.json());
    }

    async function saveCurrentAmount(id: string | number, raw: string) {
        const value = raw.trim();
        await fetch("/api/investments", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                id,
                currentAmount: value === "" ? "" : Number(value),
            }),
        });
        const res = await fetch("/api/investments");
        setItems(await res.json());
    }

    async function copyId(id: string | number) {
        try {
            await navigator.clipboard.writeText(String(id));
        } catch {
            window.prompt("Copy the ID:", String(id));
        }
    }

    async function saveDate(
        id: string | number,
        field: "startDate" | "endDate",
        value: string,
    ) {
        await fetch("/api/investments", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id, [field]: value }),
        });
        const res = await fetch("/api/investments");
        setItems(await res.json());
    }

    // Sum of the current value of every investment (shown as the last row).
    const totalCurrent = items.reduce(
        (sum, it) => sum + (it.estimate?.currentValue ?? 0),
        0,
    );

    return (
        <Box>
            <Typography variant='h5' gutterBottom>
                Investments
            </Typography>
            <Box
                component='form'
                onSubmit={add}
                sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                    gap: 2,
                    mb: 3,
                }}
            >
                <TextField
                    required
                    label='Name'
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <TextField
                    select
                    label='Type'
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                    <MenuItem value='SIP'>SIP</MenuItem>
                    <MenuItem value='RD'>RD</MenuItem>
                    <MenuItem value='FD'>FD</MenuItem>
                </TextField>
                <TextField
                    type='date'
                    label='Start'
                    InputLabelProps={{ shrink: true }}
                    value={form.startDate}
                    onChange={(e) =>
                        setForm({ ...form, startDate: e.target.value })
                    }
                    required
                />
                <TextField
                    type='date'
                    label='Maturity Month'
                    title='Maturity/withdrawal month. The last payable installment is the month before this.'
                    InputLabelProps={{ shrink: true }}
                    value={form.endDate}
                    onChange={(e) =>
                        setForm({ ...form, endDate: e.target.value })
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
                    select
                    label='Compounding'
                    value={form.compounding}
                    onChange={(e) =>
                        setForm({ ...form, compounding: e.target.value })
                    }
                >
                    <MenuItem value='monthly'>Monthly</MenuItem>
                    <MenuItem value='quarterly'>Quarterly</MenuItem>
                    <MenuItem value='half-yearly'>Half-yearly</MenuItem>
                    <MenuItem value='annually'>Annually</MenuItem>
                </TextField>
                <TextField
                    type='number'
                    label='Interest % p.a.'
                    title='Annual interest rate in percent. Leave empty to use the default (6.5% p.a.).'
                    inputProps={{ min: 0, step: "any" }}
                    value={form.interestRate}
                    onChange={(e) =>
                        setForm({ ...form, interestRate: e.target.value })
                    }
                />
                <TextField
                    type='number'
                    label='Maturity Amount'
                    title='Fixed maturity amount. Leave empty to use the calculated estimate.'
                    inputProps={{ min: 0, step: "any" }}
                    value={form.customMaturityAmount}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            customMaturityAmount: e.target.value,
                        })
                    }
                />
                <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Button type='submit' variant='contained' fullWidth>
                        Add
                    </Button>
                </Box>
            </Box>

            <Typography variant='h6' gutterBottom>
                All
            </Typography>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Start</TableCell>
                        <TableCell>Maturity Month</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Current Amount</TableCell>
                        <TableCell>Maturity Amount</TableCell>
                        <TableCell>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {items.map((it) => (
                        <TableRow key={String(it.id)}>
                            <TableCell>
                                <span
                                    style={{
                                        display: "inline-block",
                                        width: 10,
                                        height: 10,
                                        borderRadius: "50%",
                                        background: colorFor(it.id),
                                        marginRight: 8,
                                    }}
                                />
                                {it.name}
                                <IconButton
                                    size='small'
                                    title='Copy ID'
                                    sx={{ ml: 0.5, p: 0.25 }}
                                    onClick={() => copyId(it.id)}
                                >
                                    <CopyIcon />
                                </IconButton>
                            </TableCell>
                            <TableCell>{it.type}</TableCell>
                            {(["startDate", "endDate"] as const).map(
                                (field) => (
                                    <TableCell key={field}>
                                        {editingDate &&
                                        editingDate.id === it.id &&
                                        editingDate.field === field ? (
                                            <>
                                                <TextField
                                                    size='small'
                                                    type='date'
                                                    autoFocus
                                                    InputLabelProps={{
                                                        shrink: true,
                                                    }}
                                                    value={editingDateValue}
                                                    onChange={(e) =>
                                                        setEditingDateValue(
                                                            e.target.value,
                                                        )
                                                    }
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            saveDate(
                                                                it.id,
                                                                field,
                                                                editingDateValue,
                                                            );
                                                            setEditingDate(
                                                                null,
                                                            );
                                                        }
                                                        if (e.key === "Escape")
                                                            setEditingDate(
                                                                null,
                                                            );
                                                    }}
                                                />
                                                <Button
                                                    size='small'
                                                    sx={{ ml: 0.5 }}
                                                    onClick={() => {
                                                        saveDate(
                                                            it.id,
                                                            field,
                                                            editingDateValue,
                                                        );
                                                        setEditingDate(null);
                                                    }}
                                                >
                                                    Save
                                                </Button>
                                                <Button
                                                    size='small'
                                                    onClick={() =>
                                                        setEditingDate(null)
                                                    }
                                                >
                                                    Cancel
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                {it[field] || "-"}
                                                <IconButton
                                                    size='small'
                                                    title={`Edit ${field === "startDate" ? "start" : "maturity"} month`}
                                                    sx={{ ml: 0.5, p: 0.25 }}
                                                    onClick={() => {
                                                        setEditingDate({
                                                            id: it.id,
                                                            field,
                                                        });
                                                        setEditingDateValue(
                                                            String(
                                                                it[field] ?? "",
                                                            ),
                                                        );
                                                    }}
                                                >
                                                    <PencilIcon />
                                                </IconButton>
                                            </>
                                        )}
                                    </TableCell>
                                ),
                            )}
                            <TableCell>{it.amount}</TableCell>
                            <TableCell>
                                <Chip
                                    label={statusOf(it).label}
                                    color={statusOf(it).color}
                                    size='small'
                                    variant='outlined'
                                />
                            </TableCell>
                            <TableCell>
                                {editingCurrentId === it.id ? (
                                    <TextField
                                        size='small'
                                        type='number'
                                        autoFocus
                                        placeholder='Current amount ₹'
                                        inputProps={{ min: 0, step: "any" }}
                                        sx={{ width: 150 }}
                                        value={editingCurrentValue}
                                        onChange={(e) =>
                                            setEditingCurrentValue(
                                                e.target.value,
                                            )
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                saveCurrentAmount(
                                                    it.id,
                                                    editingCurrentValue,
                                                );
                                                setEditingCurrentId(null);
                                            }
                                            if (e.key === "Escape")
                                                setEditingCurrentId(null);
                                        }}
                                    />
                                ) : (
                                    <span
                                        title={
                                            it.estimate?.isCustomCurrent
                                                ? "Manually set. Clear the field and save to return to the calculated value."
                                                : `Paid: ₹${fmt(it.estimate?.paidToDate ?? 0)} · Interest gained: ₹${fmt(it.estimate?.interestToDate ?? 0)} · ${it.estimate?.paidInstallments ?? 0} installment(s)`
                                        }
                                    >
                                        {it.estimate
                                            ? `₹${fmt(it.estimate.currentValue)}`
                                            : "-"}
                                        {it.estimate?.isCustomCurrent
                                            ? " *"
                                            : ""}
                                    </span>
                                )}
                                {editingCurrentId === it.id ? (
                                    <>
                                        <Button
                                            size='small'
                                            sx={{ ml: 1 }}
                                            onClick={() => {
                                                saveCurrentAmount(
                                                    it.id,
                                                    editingCurrentValue,
                                                );
                                                setEditingCurrentId(null);
                                            }}
                                        >
                                            Save
                                        </Button>
                                        <Button
                                            size='small'
                                            onClick={() =>
                                                setEditingCurrentId(null)
                                            }
                                        >
                                            Cancel
                                        </Button>
                                    </>
                                ) : (
                                    <IconButton
                                        size='small'
                                        title='Edit current amount'
                                        sx={{ ml: 0.5, p: 0.25 }}
                                        onClick={() => {
                                            setEditingCurrentId(it.id);
                                            setEditingCurrentValue(
                                                it.currentAmount
                                                    ? String(it.currentAmount)
                                                    : it.estimate
                                                      ? String(
                                                            it.estimate
                                                                .currentValue,
                                                        )
                                                      : "",
                                            );
                                        }}
                                    >
                                        <PencilIcon />
                                    </IconButton>
                                )}
                            </TableCell>
                            <TableCell>
                                {editingId === it.id ? (
                                    <TextField
                                        size='small'
                                        type='number'
                                        autoFocus
                                        placeholder='Empty = use estimate'
                                        inputProps={{ min: 0, step: "any" }}
                                        sx={{ width: 140 }}
                                        value={editingValue}
                                        onChange={(e) =>
                                            setEditingValue(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                saveCustomMaturity(
                                                    it.id,
                                                    editingValue,
                                                );
                                                setEditingId(null);
                                            }
                                            if (e.key === "Escape")
                                                setEditingId(null);
                                        }}
                                    />
                                ) : (
                                    <span title='The custom amount overrides the estimate when set'>
                                        {it.estimate?.customMaturityAmount
                                            ? `₹${fmt(it.estimate.customMaturityAmount)}`
                                            : "-"}
                                    </span>
                                )}
                                {editingId === it.id ? (
                                    <>
                                        <Button
                                            size='small'
                                            sx={{ ml: 1 }}
                                            onClick={() => {
                                                saveCustomMaturity(
                                                    it.id,
                                                    editingValue,
                                                );
                                                setEditingId(null);
                                            }}
                                        >
                                            Save
                                        </Button>
                                        <Button
                                            size='small'
                                            onClick={() => setEditingId(null)}
                                        >
                                            Cancel
                                        </Button>
                                    </>
                                ) : (
                                    <IconButton
                                        size='small'
                                        title='Edit custom maturity'
                                        sx={{ ml: 0.5, p: 0.5 }}
                                        onClick={() => {
                                            setEditingId(it.id);
                                            setEditingValue(
                                                it.estimate
                                                    ?.customMaturityAmount
                                                    ? String(
                                                          it.estimate
                                                              .customMaturityAmount,
                                                      )
                                                    : "",
                                            );
                                        }}
                                    >
                                        <PencilIcon />
                                    </IconButton>
                                )}
                            </TableCell>
                            <TableCell>
                                <IconButton
                                    size='small'
                                    color='error'
                                    title='Delete investment'
                                    sx={{ p: 0.5 }}
                                    onClick={() => remove(it.id)}
                                >
                                    <TrashIcon />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                    {items.length > 0 && (
                        <TableRow
                            sx={{
                                borderTop: "2px solid",
                                borderColor: "divider",
                            }}
                        >
                            <TableCell colSpan={6} sx={{ fontWeight: "bold" }}>
                                Total
                            </TableCell>
                            <TableCell
                                sx={{ fontWeight: "bold" }}
                                title='Total money currently across all investments'
                            >
                                ₹{fmt(totalCurrent)}
                            </TableCell>
                            <TableCell colSpan={2} />
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Box>
    );
}
