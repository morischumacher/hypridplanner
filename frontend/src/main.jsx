import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { ProgramProvider } from "./ProgramContext.jsx";
import AuthGate from "./AuthGate.jsx";
import { fetchCurrentUser, fetchProfileSettings, signOut } from "./lib/api.js";
import { MASTER_PROGRAM_CODE } from "./domain/programmes.ts";
import "./global.css";

const container = document.getElementById("root");
if (!container) {
    throw new Error("No root element found. Did you forget <div id=\"root\"></div> in index.html?");
}

function Root() {
    const [user, setUser] = useState(null);
    const [initialProgramCode, setInitialProgramCode] = useState(MASTER_PROGRAM_CODE);
    const [openSignupSetupOnEntry, setOpenSignupSetupOnEntry] = useState(false);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState("");

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const me = await fetchCurrentUser();
                if (cancelled) return;
                setAuthError("");
                if (me?.user) {
                    // Open on the programme chosen at signup instead of the default.
                    const settings = await fetchProfileSettings().catch(() => null);
                    if (cancelled) return;
                    const locked = String(settings?.locked_program_code || "").trim();
                    if (locked) setInitialProgramCode(locked);
                }
                setUser(me?.user ?? null);
            } catch (e) {
                if (cancelled) return;
                // Backend may be unavailable during bootstrap, treat as signed out rather than an error.
                setAuthError("");
                setUser(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontSize: 14, color: "#6b7280" }}>
                Loading...
            </div>
        );
    }

    if (!user) {
        return (
            <>
                {authError && (
                    <div style={{ position: "fixed", top: 12, right: 12, zIndex: 20, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 8, padding: "6px 10px", fontSize: 12 }}>
                        {authError}
                    </div>
                )}
                <AuthGate onAuthenticated={(nextUser, authContext = null) => {
                    setAuthError("");
                    if (authContext?.programCode) setInitialProgramCode(authContext.programCode);
                    setOpenSignupSetupOnEntry(Boolean(authContext?.openSignupSetupOnEntry));
                    setUser(nextUser);
                }} />
            </>
        );
    }

    return (
        <ProgramProvider initialProgramCode={initialProgramCode}>
            <App
                currentUser={user}
                openSignupSetupOnEntry={openSignupSetupOnEntry}
                onSignupSetupPromptConsumed={() => setOpenSignupSetupOnEntry(false)}
                onSignOut={async () => {
                    await signOut().catch(() => null);
                    setAuthError("");
                    setOpenSignupSetupOnEntry(false);
                    setUser(null);
                }}
            />
        </ProgramProvider>
    );
}

createRoot(container).render(
    <React.StrictMode>
        <Root />
    </React.StrictMode>
);
