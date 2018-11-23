import * as SimpleFromTree from './fromTree';
import * as SimpleToTree from './toTree';
import { V1 } from './constants';
import { SieveError } from './Errors';

const DEBUG = false;

export default {
    /**
     * Computes Simple representation of a filter tree.
     * @return {{}} - the sieve representation.
     * @param {[]} tree - a filter tree.
     */
    fromTree: (tree) => {
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
     * @param {{}} simple - the filter representation.
     * @param {Number=1} version - the version, either 1 or 2.
     * @return {Array}
     */
    toTree: (simple, version = V1) => {
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
