import { SieveError } from './';

export class InvalidInputError extends SieveError {
    constructor(message) {
        super(message);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, InvalidInputError);
        }
    }
}
