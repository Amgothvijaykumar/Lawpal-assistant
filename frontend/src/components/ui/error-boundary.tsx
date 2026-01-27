import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./button";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
                    <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground">
                        Something went wrong
                    </h1>
                    <div className="mb-8 text-muted-foreground max-w-md">
                        We apologize for the inconvenience. An unexpected error has occurred.
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg mb-8 text-left text-xs font-mono overflow-auto max-w-lg w-full border border-border">
                        {this.state.error?.toString()}
                    </div>
                    <Button onClick={() => window.location.reload()} variant="default" size="lg">
                        Reload Application
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
