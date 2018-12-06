/**
 * Extending Error doesn't work properly with babel. It breaks the instanceof operator.
 * https://github.com/babel/babel/issues/4480
 *
 * @param {String} name - Name of error
 * @param {ErrorConstructor} baseClass=Error - the base class of the error.
 * @returns {Function} Custom error
 */
const generateError = (name, baseClass = Error) => {
    function CustomError(message) {
        this.message = message;
        this.stack = new baseClass().stack;
    }

    CustomError.prototype = Object.create(baseClass.prototype);
    CustomError.prototype.name = name;
    return CustomError;
};

export const SieveError = generateError('SieveError');
export const UnsupportedRepresentationError = generateError('UnsupportedRepresentationError', SieveError);
export const InvalidInputError = generateError('InvalidInputError', SieveError);

/**
 * Create a custom error for your component in order to have something verbose
 * with some help.
 * Bref, a great error.
 * @param  {String} component  component's name
 * @return {Function}          Taking, lines ...[<String>] as arguments, as many as you want.
 */
export const info = (component) => (...lines) => {
    return `[${component}] ${lines.join('\n')}`;
};
