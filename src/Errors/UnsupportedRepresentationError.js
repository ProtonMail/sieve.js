import { SieveError } from './';

export class UnsupportedRepresentationError extends SieveError {
    constructor(message) {
        super(message);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, UnsupportedRepresentationError);
        }
    }
}
