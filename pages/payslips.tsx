import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

export default function Payslips(): JSX.Element {
    const [items, setItems] = useState<any[]>([]);
    const [form, setForm] = useState({
        date: "",
        gross: "",
        basic: "",
        hra: "",
        allowances: "",
        deductions: "",
        notes: "",
    });

    useEffect(() => {
        fetch("/api/payslips")
            .then((r) => r.json())
            .then(setItems);
    }, []);

    async function add(e: React.FormEvent) {
        e.preventDefault();
        const body = {
            ...form,
            net: Number(form.gross || 0) - Number(form.deductions || 0),
        };
        await fetch("/api/payslips", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
        });
        setItems(await (await fetch("/api/payslips")).json());
    }

    return (
        <Box>
            <Typography variant='h5'>Payslip Breaker</Typography>
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
                    label='Gross'
                    type='number'
                    value={form.gross}
                    onChange={(e) =>
                        setForm({ ...form, gross: e.target.value })
                    }
                    required
                />
                <TextField
                    label='Basic'
                    type='number'
                    value={form.basic}
                    onChange={(e) =>
                        setForm({ ...form, basic: e.target.value })
                    }
                />
                <TextField
                    label='HRA'
                    type='number'
                    value={form.hra}
                    onChange={(e) => setForm({ ...form, hra: e.target.value })}
                />
                <TextField
                    label='Allowances'
                    type='number'
                    value={form.allowances}
                    onChange={(e) =>
                        setForm({ ...form, allowances: e.target.value })
                    }
                />
                <TextField
                    label='Deductions'
                    type='number'
                    value={form.deductions}
                    onChange={(e) =>
                        setForm({ ...form, deductions: e.target.value })
                    }
                />
                <TextField
                    label='Notes'
                    value={form.notes}
                    onChange={(e) =>
                        setForm({ ...form, notes: e.target.value })
                    }
                />
                <Button type='submit' variant='contained'>
                    Add Payslip
                </Button>
            </Box>

            <Typography variant='h6'>Visualize</Typography>
            <Box>
                {items.map((it) => (
                    <Box
                        key={String(it.id)}
                        sx={{
                            bgcolor: "background.paper",
                            p: 2,
                            borderRadius: 1,
                            my: 1,
                        }}
                    >
                        <Typography sx={{ fontWeight: 600 }}>
                            {it.date} — Net: {it.net}
                        </Typography>
                        <Box
                            sx={{
                                display: "flex",
                                height: 28,
                                width: "100%",
                                borderRadius: 1,
                                overflow: "hidden",
                                mt: 1,
                            }}
                        >
                            {(() => {
                                const gross = Number(it.gross) || 0;
                                const deductions = Number(it.deductions) || 0;
                                const basic = Number(it.basic) || 0;
                                const hra = Number(it.hra) || 0;
                                const allowances = Number(it.allowances) || 0;
                                const parts = [
                                    { k: "Basic", v: basic, color: "#2563eb" },
                                    { k: "HRA", v: hra, color: "#059669" },
                                    {
                                        k: "Allow",
                                        v: allowances,
                                        color: "#d97706",
                                    },
                                ];
                                return (
                                    <>
                                        {parts.map((p) => (
                                            <div
                                                key={p.k}
                                                style={{
                                                    width: `${(p.v / Math.max(gross, 1)) * 100}%`,
                                                    background: p.color,
                                                }}
                                                title={`${p.k}: ${p.v}`}
                                            ></div>
                                        ))}
                                        <div
                                            style={{
                                                width: `${(deductions / Math.max(gross, 1)) * 100}%`,
                                                background: "#ef4444",
                                            }}
                                            title={`Deductions: ${deductions}`}
                                        ></div>
                                    </>
                                );
                            })()}
                        </Box>
                        <Typography sx={{ color: "text.secondary", mt: 1 }}>
                            {it.notes}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    );
}
