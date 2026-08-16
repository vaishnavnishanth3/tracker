import Link from "next/link";
import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

const shortcuts = [
    {
        title: "Investments",
        href: "/investments",
        description: "Manage SIPs, FDs and your portfolio details.",
    },
    {
        title: "Checklist",
        href: "/checklist",
        description: "Track task completion for each investment cycle.",
    },
    {
        title: "Expenses",
        href: "/expenses",
        description: "Log monthly balances and spending categories.",
    },
    {
        title: "Payslips",
        href: "/payslips",
        description: "Break down your salary and deductions visually.",
    },
    {
        title: "Timeline",
        href: "/timeline",
        description: "See how your investments span across periods.",
    },
];

export default function Home(): JSX.Element {
    return (
        <Box sx={{ py: 2 }}>
            <Box
                sx={{
                    background:
                        "linear-gradient(135deg, rgba(99,102,241,0.22), rgba(15,23,42,0.94)), #0f172a",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: 4,
                    p: { xs: 3, md: 4 },
                    mb: 4,
                }}
            >
                <Typography variant='h3' gutterBottom sx={{ color: "#f8fafc" }}>
                    Welcome to your financial dashboard
                </Typography>
                <Typography
                    variant='body1'
                    sx={{ color: "#cbd5e1", maxWidth: 700 }}
                >
                    Keep a clean view of investments, monthly expenses, payroll,
                    and progress across the year from one place.
                </Typography>
            </Box>

            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "1fr 1fr",
                        sm: "repeat(2, minmax(0, 1fr))",
                        md: "repeat(3, minmax(0, 1fr))",
                    },
                    gap: 2,
                    mb: 4,
                }}
            >
                {shortcuts.map((item) => (
                    <Card
                        key={item.href}
                        sx={{
                            bgcolor: "#ffffff",
                            color: "#0f172a",
                            transition:
                                "transform 0.2s ease, box-shadow 0.2s ease",
                            boxShadow: "0 18px 38px rgba(15, 23, 42, 0.12)",
                            height: "100%",
                            "&:hover": {
                                transform: "translateY(-2px)",
                                boxShadow: "0 20px 42px rgba(15, 23, 42, 0.18)",
                            },
                        }}
                    >
                        <CardActionArea component={Link} href={item.href}>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant='h6' gutterBottom>
                                    {item.title}
                                </Typography>
                                <Typography
                                    variant='body2'
                                    sx={{ color: "#475569", mb: 2 }}
                                >
                                    {item.description}
                                </Typography>
                                <Button
                                    variant='contained'
                                    sx={{
                                        bgcolor: "#0f172a",
                                        color: "#ffffff",
                                        borderRadius: 999,
                                        px: 2,
                                        "&:hover": { bgcolor: "#1e293b" },
                                    }}
                                >
                                    Open
                                </Button>
                            </CardContent>
                        </CardActionArea>
                    </Card>
                ))}
            </Box>

            <Box
                sx={{
                    bgcolor: "#ffffff",
                    color: "#0f172a",
                    borderRadius: 3,
                    p: 3,
                    border: "1px solid rgba(148, 163, 184, 0.28)",
                }}
            >
                <Typography variant='h6' gutterBottom>
                    Workbook data
                </Typography>
                <Typography>
                    Data stored in an Excel workbook at{" "}
                    <strong>data/finance.xlsx</strong>.
                </Typography>
                <Typography sx={{ mt: 1 }}>
                    Initialize workbook: <a href='/api/init'>/api/init</a>
                </Typography>
            </Box>
        </Box>
    );
}
