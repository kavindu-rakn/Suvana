"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ModelErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("3D avatar failed to load:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-foreground-muted">
          <p>Couldn&apos;t load the 3D avatar.</p>
          <p>
            Make sure <code className="text-accent">public/models/avatar.glb</code> exists.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
