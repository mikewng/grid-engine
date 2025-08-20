export class Result<T> {
    constructor(
        public readonly success: boolean,
        public readonly value?: T,
        public readonly err?: string
    ) { }

    static Success<U>(value: U): Result<U> {
        return new Result<U>(true, value)
    }

    static Fail<U>(err: string): Result<U> {
        return new Result<U>(false, undefined, err)
    }
}