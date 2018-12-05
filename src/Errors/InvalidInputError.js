import { SieveError } from './';

export default class InvalidInputError extends SieveError {
    constructor(message) {
        super(message);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, InvalidInputError);
        }
    }
}
