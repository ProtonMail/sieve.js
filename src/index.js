import * as SimpleFromTree from './fromTree';
import * as SimpleToTree from './toTree';
import { V1 } from './constants';
import { SieveError } from './Errors';

const DEBUG = false;

export default {
    /**
     * Computes Simple representation of a filter tree.
     * @param {Array} tree - a filter tree.
     * @return {Object} - the sieve representation, empty object if the filter cannot be simplified.
     */
    fromTree(tree) {
        try {
            return SimpleFromTree.fromTree(tree);
        } catch (exception) {
            if (DEBUG) {
                console.error(exception);
            }
            if (exception instanceof SieveError) {
                return {};
            }
            throw exception;
        }
    },
    /**
     * Transforms a simple representation to a filter tree.
     * @param {Object} simple - the filter representation.
     * @param {Number=1} version - the version, either 1 or 2.
     * @return {Array} the filter representation, empty array if an error occurred.
     */
    toTree(simple, version = V1) {
        try {
            return SimpleToTree.toTree(simple, version);
        } catch (exception) {
            if (DEBUG) {
                console.error(exception);
            }
            if (exception instanceof SieveError) {
                return [];
            }
            throw exception;
        }
    }
};
