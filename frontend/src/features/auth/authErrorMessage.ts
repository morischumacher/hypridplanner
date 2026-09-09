/**
 * What to tell someone whose sign-in or sign-up did not work.
 *
 * The transport's own words are not an answer: "Signup failed: 409 Conflict
 * {"detail":"Username already exists"}" tells a student what the server thinks
 * and nothing about what to do next, and that is what the evaluation recorded
 * (E-P41). Every message here names the problem and the next action, and the
 * status decides which one, so an unrecognised failure still says something
 * true rather than leaking the response body.
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
