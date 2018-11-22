import * as SimpleFromTree from './fromTree';
import * as SimpleToTree from './toTree';
import { V1 } from './constants';

const DEBUG = true;

/**
 * Public interface to the fromTree() function
 */
export default {
    fromTree: (tree) => {
        try {
            return SimpleFromTree.fromTree(tree);
        } catch (exception) {
            if (DEBUG) {
                console.error(exception);
            }
            return {};
        }
    },
    toTree: (modal, version = V1) => {
        try {
            return SimpleToTree.toTree(modal, version);
        } catch (exception) {
            if (DEBUG) {
                console.error(exception);
            }
            return [];
        }
    }
};
