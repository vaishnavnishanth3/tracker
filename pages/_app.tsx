import "../styles.css";
import type { AppProps } from "next/app";
import * as React from "react";
import { CacheProvider, EmotionCache } from "@emotion/react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import AppBar from "@mui/material/AppBar";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Link from "next/link";
import { useRouter } from "next/router";
import createEmotionCache from "../src/createEmotionCache";
import theme from "../src/theme";

const clientSideEmotionCache = createEmotionCache();

const navItems = [
    { label: "Home", href: "/" },
    { label: "Investments", href: "/investments" },
    { label: "Calendar", href: "/calendar" },
    { label: "Checklist", href: "/checklist" },
    { label: "Expenses", href: "/expenses" },
    { label: "Payslips", href: "/payslips" },
    { label: "ITR", href: "/itr" },
];

interface MyAppProps extends AppProps {
    emotionCache?: EmotionCache;
}

export default function App({
    Component,
    pageProps,
    emotionCache = clientSideEmotionCache,
}: MyAppProps) {
    const router = useRouter();

    return (
        <CacheProvider value={emotionCache}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <Box
                    sx={{
                        minHeight: "100vh",
                        background:
                            "radial-gradient(circle at top, rgba(99, 102, 241, 0.22), transparent 35%), #020817",
                    }}
                >
                    <AppBar
                        position='sticky'
                        color='transparent'
                        elevation={0}
                        sx={{
                            borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
                            background: "rgba(15, 23, 42, 0.82)",
                            backdropFilter: "blur(10px)",
                        }}
                    >
                        <Toolbar
                            sx={{ maxWidth: 1200, width: "100%", mx: "auto" }}
                        >
                            <Link href='/' legacyBehavior passHref>
                                <Typography
                                    component='a'
                                    variant='h6'
                                    sx={{
                                        color: "#f8fafc",
                                        textDecoration: "none",
                                        fontWeight: 700,
                                        letterSpacing: 0.5,
                                    }}
                                >
                                    Financial Tracker
                                </Typography>
                            </Link>

                            <Stack
                                direction='row'
                                spacing={1}
                                sx={{
                                    ml: "auto",
                                    flexWrap: "wrap",
                                    justifyContent: "flex-end",
                                }}
                            >
                                {navItems.map((item) => {
                                    const active =
                                        router.pathname === item.href;
                                    return (
                                        <Button
                                            key={item.href}
                                            component={Link}
                                            href={item.href}
                                            variant={
                                                active ? "contained" : "text"
                                            }
                                            color={
                                                active ? "primary" : "inherit"
                                            }
                                            sx={{
                                                color: active
                                                    ? "#fff"
                                                    : "#e2e8f0",
                                                minWidth: 0,
                                                px: 1.5,
                                                py: 0.75,
                                                fontSize: 14,
                                            }}
                                        >
                                            {item.label}
                                        </Button>
                                    );
                                })}
                            </Stack>
                        </Toolbar>
                    </AppBar>

                    <Container maxWidth='xl' sx={{ py: 4 }}>
                        <Component {...pageProps} />
                    </Container>
                </Box>
            </ThemeProvider>
        </CacheProvider>
    );
}
