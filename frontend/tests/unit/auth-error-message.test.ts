/**
 * Every branch names the problem and the next step, and none echoes the
 * response's status or body.
 */
import { describe, expect, it } from "vitest";

import { authErrorMessage } from "../../src/features/auth/authErrorMessage.ts";

describe("authErrorMessage", () => {
    it("says the username is taken, and what to do instead", () => {
        const message = authErrorMessage("signup", { status: 409, detail: "Username already exists" });
        expect(message).toContain("taken");
        expect(message).toContain("sign in");
    });

    it("says the credentials do not match, and what to do instead", () => {
        const message = authErrorMessage("signin", { status: 401, detail: "Invalid username or password" });
        expect(message).toContain("do not match");
        expect(message).toContain("sign up");
    });

    it("asks for the missing field on a bad request", () => {
        expect(authErrorMessage("signup", { status: 400 })).toContain("username and a password");
        expect(authErrorMessage("signin", { status: 400 })).toContain("username and a password");
    });

    it("treats a server failure and an unreachable backend as the same wait-and-retry", () => {
        expect(authErrorMessage("signin", { status: 500 })).toContain("cannot be reached");
        expect(authErrorMessage("signup", null)).toContain("cannot be reached");
        expect(authErrorMessage("signup", { status: undefined })).toContain("cannot be reached");
    });

    it("never echoes the service's own sentence or the status", () => {
        const failures = [
            { status: 409, detail: "Username already exists" },
            { status: 401, detail: "Invalid username or password" },
            { status: 418, detail: "I am a teapot" },
            { status: 500, detail: "StorageFailure" },
        ];
        for (const mode of ["signin", "signup"] as const) {
            for (const failure of failures) {
                const message = authErrorMessage(mode, failure);
                expect(message).not.toContain(String(failure.status));
                expect(message).not.toContain(failure.detail);
            }
        }
    });
});
