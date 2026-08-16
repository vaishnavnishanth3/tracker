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
            <Typography variant='h3' gutterBottom>
                Welcome to your financial dashboard
            </Typography>
            <Typography
                variant='body1'
                sx={{ color: "text.secondary", maxWidth: 700, mb: 4 }}
            >
                Keep a clean view of investments, monthly expenses, payroll, and
                progress across the year from one place.
            </Typography>

            <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                sx={{ flexWrap: "wrap", mb: 4 }}
            >
                {shortcuts.map((item) => (
                    <Card
                        key={item.href}
                        sx={{
                            minWidth: { xs: "100%", sm: 220, md: 240 },
                            flex: 1,
                            bgcolor: "#ffffff",
                            color: "#0f172a",
                        }}
                    >
                        <CardActionArea component={Link} href={item.href}>
                            <CardContent>
                                <Typography variant='h6' gutterBottom>
                                    {item.title}
                                </Typography>
                                <Typography
                                    variant='body2'
                                    sx={{ color: "#475569" }}
                                >
                                    {item.description}
                                </Typography>
                                <Button
                                    sx={{ mt: 2, color: "#0f172a" }}
                                    variant='text'
                                >
                                    Open
                                </Button>
                            </CardContent>
                        </CardActionArea>
                    </Card>
                ))}
            </Stack>

            <Box
                sx={{
                    bgcolor: "background.paper",
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
