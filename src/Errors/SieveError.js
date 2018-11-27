export default class SieveError extends Error {
    constructor(message) {
        super(message);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, SieveError);
        }
    }
}
