/**
 * User-facing messages for failed sign-in and sign-up.
 *
 * Messages are chosen by status code alone, so an unrecognised failure still
 * produces something actionable rather than leaking the response body.
 */

export type AuthMode = "signin" | "signup";

export interface AuthFailure {
    status?: number | undefined;
    detail?: string | undefined;
}

const SIGNUP_BY_STATUS: Record<number, string> = {
    400: "Enter both a username and a password.",
    409: "That username is taken. Pick a different one, or sign in if the account is yours.",
};

const SIGNIN_BY_STATUS: Record<number, string> = {
    400: "Enter both a username and a password.",
    401: "That username and password do not match an account. Check them, or sign up to create one.",
};

const UNAVAILABLE = "The planner cannot be reached right now. Try again in a moment.";
const UNEXPECTED_SIGNUP = "The account could not be created. Try again in a moment.";
const UNEXPECTED_SIGNIN = "Sign-in did not work. Try again in a moment.";

export function authErrorMessage(mode: AuthMode, failure: AuthFailure | null | undefined): string {
    const status = Number(failure?.status);
    if (!Number.isFinite(status) || status === 0) return UNAVAILABLE;
    if (status >= 500) return UNAVAILABLE;
    const known = mode === "signup" ? SIGNUP_BY_STATUS[status] : SIGNIN_BY_STATUS[status];
    if (known) return known;
    return mode === "signup" ? UNEXPECTED_SIGNUP : UNEXPECTED_SIGNIN;
}
