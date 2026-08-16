import React from "react";
import NextErrorComponent from "next/error";

export default function MyError({ statusCode }: { statusCode?: number }) {
    return <NextErrorComponent statusCode={statusCode || 500} />;
}

MyError.getInitialProps = async ({ res, err }: any) => {
    const statusCode = res?.statusCode ?? err?.statusCode ?? 500;
    return { statusCode };
};
