import { buildLabelValueObject, invert } from './commons';
import { LABEL_KEYS, MATCH_KEYS, OPERATOR_KEYS } from './constants';
import { InvalidInputError, UnsupportedRepresentationError } from './Errors';

/**
 * Validate the tree and extracts the main node.
 * @param {object[]} tree - the tree
 * @return {{comment: {Text: string, Type: 'Comment'}, tree: {If: object, Then: array, Else: *, Type: string}}}
 */
function extractMainNode(tree) {
    let string = '';

    let mainNode;
    const requiredExtensions = ['fileinto', 'imap4flags'];
    let comment;
    if (tree instanceof Array) {
        const treeLength = tree.length;
        for (let i = 0; i < treeLength; i++) {
            const node = tree[i];
            if (node.Type === 'Require') {
                let extensionIndex = requiredExtensions.length;
                while (extensionIndex--) {
                    const extension = requiredExtensions[extensionIndex];
                    if (node.List.indexOf(extension) > -1) {
                        requiredExtensions.splice(extensionIndex, 1);
                    }
                }
            } else if (node.Type === 'If') {
                // must have all these keys. All of them must be array (so none == false)
                string = ['If', 'Then', 'Type'].find((key) => !node[key]);
                if (!string) {
                    if (!node.If.Tests) {
                        string = 'Tests';
                    } else {
                        mainNode = node;
                    }
                }
            } else if (
                node.Type === 'Comment' &&
                node.Text.match(/^\/\*\*\r\n(?:\s\*\s@(?:type|comparator)[^\r]+\r\n)+\s\*\/$/)
            ) {
                comment = node;
            }
        }

        if (requiredExtensions.length) {
            throw new InvalidInputError('Invalid tree representation: requirements');
        }
    }

    if (!mainNode) {
        throw new InvalidInputError(`Invalid tree representation: ${string} level`);
    }

    return { comment, tree: mainNode };
}

/**
 * Parses the comparator comment, to retrieve the expected comparators.
 * @param {{Type: 'Comment', Text: string}|null} comparator the comparator comment.
 * @return {{comparators: string[], type: string}|undefined}
 */
function parseComparatorComment(comparator) {
    if (!comparator) {
        return;
    }

    const text = comparator.Text;
    const chunks = text.split('\r\n *');

    return chunks.reduce(
        ({ type, comparators }, chunk) => {
            const res = chunk.match(/\s@(\w*)\s(.*)$/);
            if (res) {
                let [, annotationType, value] = res; // skipping first value

                if (annotationType === 'type') {
                    if (value === 'and') {
                        value = 'all';
                    } else if (value === 'or') {
                        value = 'any';
                    } else {
                        throw new InvalidInputError('Unknown type: ' + value);
                    }
                    return { comparators, type: value };
                } else if (annotationType === 'comparator') {
                    return { type, comparators: [...comparators, value.replace('default', 'contains')] };
                }
            }
            return { comparators, type };
        },
        { comparators: [], type: '' }
    );
}

/**
 * Parses the different ifs.
 * @param {{Type: string, Test: *, ...}[]} ifConditions
 * @param {string[]} [commentComparators = []] - if known, the commentComparators.
 * @return {{Type: object, Comparator: *, ...}[]} a list of conditions.
 */
function parseIfConditions(ifConditions, commentComparators = []) {
    const conditions = [];

    for (let index = 0; index < ifConditions.length; index++) {
        let element = ifConditions[index];
        let commentComparator = commentComparators[index];

        let commentNegate;
        if (commentComparator) {
            commentNegate = commentComparator.startsWith('!');
            if (commentNegate) {
                commentComparator = commentComparator.slice(1);
            }
        }

        const negate = element.Type === 'Not';
        if (negate) {
            element = element.Test;
        }

        if (commentComparator && commentNegate !== negate) {
            throw new UnsupportedRepresentationError('Comment and computed negation incompatible');
        }

        let type;
        let params;

        switch (element.Type) {
            case 'Exists':
                if (element.Headers.indexOf('X-Attached') > -1) {
                    type = 'attachments';
                }
                break;

            case 'Header':
                if (element.Headers.indexOf('Subject') > -1) {
                    type = 'subject';
                }
                break;

            case 'Address':
                if (element.Headers.indexOf('From') > -1) {
                    type = 'sender';
                } else if (element.Headers.indexOf('To') > -1) {
                    type = 'recipient';
                } else if (element.Headers.indexOf('Cc') > -1) {
                    type = 'recipient';
                } else if (element.Headers.indexOf('Bcc') > -1) {
                    type = 'recipient';
                }
                break;
        }
        const comparator = type === 'attachments' ? 'Contains' : element.Match.Type;
        const values = element.Keys || [];

        params = buildSimpleParams(comparator, values, negate, commentComparator);

        conditions.push(buildSimpleCondition(type, comparator, params));
    }

    return conditions;
}

/**
 * Builds simple parameters.
 * @param {string} comparator
 * @param {string[]} values
 * @param {bool} negate
 * @param {string=} commentComparator - if given, will improve the type determination.
 * @return {{Comparator: {value: string, label: string}, Values: string[]}}
 */
function buildSimpleParams(comparator, values, negate, commentComparator) {
    if (commentComparator) {
        if (commentComparator === 'starts' || commentComparator === 'ends') {
            if (comparator !== 'Matches') {
                throw new UnsupportedRepresentationError(
                    `Comment and computed comparator incompatible: ${comparator} instead of matches`
                );
            }

            comparator = commentComparator[0].toUpperCase() + commentComparator.slice(1);
            values = values.map((value) => {
                if (commentComparator === 'ends') {
                    return value.replace(/^\*+/g, '');
                }
                return value.replace(/\*+$/g, '');
            });
        } else if (comparator.toLowerCase() !== commentComparator) {
            throw new UnsupportedRepresentationError(
                `Comment and computed comparator incompatible: ${comparator} instead of ${commentComparator}`
            );
        }
    }

    return {
        Comparator: buildSimpleComparator(comparator, negate),
        Values: values
    };
}

/**
 * Builds a simple condition.
 * @param {string} type - the type (must be in LABEL_KEY)
 * @param {string} comparator - the comparator.
 * @param {[*]} params - any other params.
 * @return {{Type: object, Comparator: *, ...}}
 */
function buildSimpleCondition(type, comparator, params) {
    return {
        Type: buildLabelValueObject(type),
        Comparator: buildLabelValueObject(comparator),
        ...params
    };
}

/**
 * Builds the simple comparator .
 * @param {string} comparator - the comparator
 * @param {bool} negate - if true, the comparator will be negated.
 * @return {{value: string, label: string}}
 */
function buildSimpleComparator(comparator, negate) {
    comparator = invert(MATCH_KEYS)[comparator];

    if (!comparator) {
        throw new InvalidInputError('Invalid match keys');
    }

    if (negate) {
        comparator = '!' + comparator;
    }

    return buildLabelValueObject(comparator);
}

/**
 * Parse the then nodes to extract the actions.
 * @param {{Type, ...}} thenNodes - all the then nodes.
 * @return {{FileInto: String[], Mark: {Read: boolean, Starred: boolean}, Vacation: string=}}
 */
function parseThenNodes(thenNodes) {
    const actions = {
        FileInto: [],
        Mark: {
            Read: false,
            Starred: false
        }
    };

    for (const element of thenNodes) {
        switch (element.Type) {
            case 'Keep':
                break;

            case 'Discard':
                actions.FileInto.push('trash');
                break;

            case 'FileInto':
                actions.FileInto.push(element.Name);
                break;

            case 'AddFlag':
                actions.Mark = {
                    Read: element.Flags.indexOf('\\Seen') > -1,
                    Starred: element.Flags.indexOf('\\Flagged') > -1
                };
                break;

            case 'Vacation':
            case 'Vacation\\Vacation':
                actions.Vacation = element.Message;
                break;
            case 'Reject':
            case 'Redirect':
            default:
                throw new UnsupportedRepresentationError(`Unsupported filter representation: ${element.Type}`);
        }
    }

    return actions;
}

/**
 * Transforms a tree into a simple representation.
 * @param {object[]} tree - a list of sieve nodes.
 * @return {{Operator: {label: string, value: string}, Conditions: object[], Actions: {FileInto: Array, Mark: {Read: boolean, Starred: boolean}}}}
 */
export const fromTree = (tree) => {
    const validated = extractMainNode(tree);
    const validatedTree = JSON.parse(JSON.stringify(validated.tree)); // cloning it.

    const comment = parseComparatorComment(validated.comment);
    const operator = invert(OPERATOR_KEYS)[validatedTree.If.Type];

    if (comment && comment.type && operator !== comment.type) {
        throw new UnsupportedRepresentationError('Comment and computed type incompatible');
    }

    const conditions = parseIfConditions(validatedTree.If.Tests, comment && comment.comparators);

    return {
        Operator: {
            label: LABEL_KEYS[operator],
            value: operator
        },
        Conditions: [...conditions],
        Actions: parseThenNodes(validatedTree.Then)
    };
};
