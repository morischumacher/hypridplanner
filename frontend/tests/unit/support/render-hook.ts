/**
 * The smallest harness that will run a hook. React renders it into a detached
 * document rather than a stand-in.
 */

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

export interface HookHarness<Props, Result> {
    /** What the hook returned when it was last rendered. */
    readonly current: Result;
    /** Renders again with new props, as a parent handing down a changed value does. */
    rerender: (props: Props) => void;
    unmount: () => void;
}

export function renderHook<Props, Result>(
    hook: (props: Props) => Result,
    initialProps: Props
): HookHarness<Props, Result> {
    // React refuses to run effects outside act without this.
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

    const container = document.createElement("div");
    document.body.appendChild(container);

    let rendered: { value: Result } | null = null;
    function Harness({ props }: { props: Props }) {
        rendered = { value: hook(props) };
        return null;
    }

    let root: Root | null = null;
    act(() => {
        root = createRoot(container);
        root.render(createElement(Harness, { props: initialProps }));
    });

    return {
        get current(): Result {
            if (!rendered) throw new Error("the hook has not rendered");
            return rendered.value;
        },
        rerender(props: Props) {
            act(() => {
                root?.render(createElement(Harness, { props }));
            });
        },
        unmount() {
            act(() => {
                root?.unmount();
            });
            container.remove();
        },
    };
}
