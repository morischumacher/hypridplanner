/**
 * What the recommendation panel says when it has nothing to show.
 *
 * A panel that answers every empty case with the same two words is a dead end:
 * the student cannot tell a channel that returned nothing from a channel they
 * switched off, or from a profile that has not been filled in yet, so there is
 * no next step to take. That is what the evaluation recorded (E-P42), and the
 * cases below are the ones the panel can actually tell apart from what it holds.
 *
 * The decision is a function of the panel's own props so it can be read and
 * tested without a canvas.
 */

export interface RecommendationLike {
    /** The channel that produced it: "interest", "similarity", and so on. */
    type?: string | undefined;
}

export interface RecommendationChannel {
    key: string;
    label: string;
}

export interface EmptyStateInput {
    /** Everything the engine returned, before the toggles filter it. */
    recommendations: readonly RecommendationLike[];
    /** Channel key to on/off; a key that is absent counts as on. */
    toggles: Record<string, boolean | undefined>;
    /** The channels the panel offers as switches. */
    channels: readonly RecommendationChannel[];
    /** Whether the profile states interests or a career direction. */
    hasStatedInterests?: boolean | undefined;
}

export interface EmptyState {
    title: string;
    detail: string;
}

function isOn(toggles: Record<string, boolean | undefined>, key: string): boolean {
    return toggles?.[key] !== false;
}

export function recommendationEmptyState(input: EmptyStateInput): EmptyState {
    const { recommendations, toggles, channels } = input;
    const all = Array.isArray(recommendations) ? recommendations : [];

    if (channels.length > 0 && channels.every((channel) => !isOn(toggles, channel.key))) {
        return {
            title: "Every source is switched off",
            detail: "Switch one of the filters above back on to see suggestions again.",
        };
    }

    const hiddenWithResults = channels.filter(
        (channel) => !isOn(toggles, channel.key) && all.some((rec) => rec.type === channel.key)
    );
    if (hiddenWithResults.length > 0) {
        const names = hiddenWithResults.map((channel) => channel.label).join(", ");
        return {
            title: "Nothing matches the filters",
            detail: `There are suggestions from ${names}. Switch that filter back on to see them.`,
        };
    }

    if (input.hasStatedInterests === false) {
        return {
            title: "No suggestions yet",
            detail: "Add your interests or a career direction in your profile; most suggestions are matched against them.",
        };
    }

    return {
        title: "No suggestions right now",
        detail: "The sources that are switched on returned nothing for this plan. Plan a course or two more, or widen the filters above.",
    };
}
