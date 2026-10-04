/**
 * Outcome of an engine operation. Checking `success` narrows the type, so after
 * `if (!result.success) return ...` the value is available without `!`.
 */
export type Result<T> =
    | { readonly success: true; readonly value: T; readonly err?: undefined }
    | { readonly success: false; readonly value?: undefined; readonly err: string };

export const Result = {
    Success<T>(value: T): Result<T> {
        return { success: true, value };
    },

    Fail<T = never>(err: string): Result<T> {
        return { success: false, err };
    },
};
