import "../styles.css";
import type { AppProps } from "next/app";
import * as React from "react";
import { CacheProvider, EmotionCache } from "@emotion/react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import createEmotionCache from "../src/createEmotionCache";
import theme from "../src/theme";

const clientSideEmotionCache = createEmotionCache();

interface MyAppProps extends AppProps {
    emotionCache?: EmotionCache;
}

export default function App({
    Component,
    pageProps,
    emotionCache = clientSideEmotionCache,
}: MyAppProps) {
    return (
        <CacheProvider value={emotionCache}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <AppBar position='static' color='primary'>
                    <Toolbar>
                        <Typography
                            variant='h6'
                            component='div'
                            sx={{ flexGrow: 1 }}
                        >
                            Financial Tracker
                        </Typography>
                    </Toolbar>
                </AppBar>
                <Container sx={{ mt: 3 }}>
                    <Component {...pageProps} />
                </Container>
            </ThemeProvider>
        </CacheProvider>
    );
}
