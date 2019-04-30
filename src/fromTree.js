import { buildLabelValueObject, findLatest, invert, unescapeCharacters, unescapeVariables } from './commons';
import { LABEL_KEYS, MATCH_KEYS, OPERATOR_KEYS } from './constants';
import { InvalidInputError, UnsupportedRepresentationError } from './Errors';

/**
 * Validate the tree and extracts the main node.
 * @param {{Type: String, List: array=, If: Object=, Text: String=, Value: String=, Name: String=}[]} tree - the tree
 * @return {{comment: {Text: String, Type: 'Comment'}, tree: {If: Object, Then: Array, Else: *, Type: String}}}
 */
function extractMainNode(tree) {
    if (!Array.isArray(tree)) {
        throw new UnsupportedRepresentationError('Array expected.');
    }

    const typed = tree.reduce(
        (acc, tree) => {
            const type = tree.Type;
            const elt = [...(acc[type] || []), tree];
            return { ...acc, [type]: elt };
        },
        {
            Set: [],
            If: [],
            Comment: [],
            Require: []
        }
    );

    if (Object.keys(typed).some((type) => !['Require', 'If', 'Comment', 'Set'].includes(type))) {
        throw new InvalidInputError(`Invalid tree representation: Invalid node types.`);
    }

    if (typed.Set.filter(({ Value, Name }) => Value === '$' && Name === 'dollar').length !== typed.Set.length) {
        throw new InvalidInputError(`Invalid tree representation: Invalid set node.`);
    }

    if (typed.If.length > 2) {
        throw new InvalidInputError(`Invalid tree representation: too many if blocks`);
    }
    if (typed.Comment.length > 2) {
        throw new InvalidInputError(`Invalid tree representation: too many comments blocks`);
    }

    const missingExtensions = typed.Require.reduce(
        (requiredExtensions, { List }) => {
            return requiredExtensions.filter((extension) => !List.includes(extension));
        },
        ['fileinto', 'imap4flags']
    );

    if (missingExtensions.length) {
        throw new InvalidInputError('Invalid tree representation: requirements');
    }

    const mainNode = findLatest(typed.If, ({ If: ifBlock, Then: thenBlock }) => thenBlock && ifBlock && ifBlock.Tests);

    if (!mainNode) {
        throw new InvalidInputError('Invalid tree representation');
    }

    const comment = findLatest(typed.Comment, ({ Text }) =>
        Text.match(/^\/\*\*\r\n(?:\s\*\s@(?:type|comparator)[^\r]+\r\n)+\s\*\/$/)
    );

    return { comment, tree: mainNode };
}

/**
 * Parses the comparator comment, to retrieve the expected comparators.
 * @param {{Type: 'Comment', Text: String}} [comparator=] the comparator comment.
 * @return {{comparators: String[], type: String}|undefined}
 */
function parseComparatorComment(comparator) {
    if (!comparator) {
        return;
    }

    const text = comparator.Text;
    const chunks = text.split('\r\n *');

    const mapAnnotation = {
        and: 'all',
        or: 'any'
    };

    const ret = chunks.reduce(
        (acc, chunk) => {
            const res = chunk.match(/\s@(\w*)\s(.*)$/);
            if (res) {
                const [, annotationType, value] = res; // skipping first value

                if (annotationType === 'type') {
                    const val = mapAnnotation[value];

                    if (!val) {
                        acc.errors.push({ type: annotationType, value });
                        return acc;
                    }

                    acc.type = val;
                    return acc;
                }

                if (annotationType === 'comparator') {
                    acc.comparators.push(value.replace('default', 'contains'));
                    return acc;
                }
            }
            return acc;
        },
        { comparators: [], type: '', errors: [] }
    );

    if (ret.errors.length) {
        throw new InvalidInputError(
            `Unknown ${ret.errors.reduce((acc, { type, value }) => `${acc ? acc + ', ' : ''}${type} "${value}"`, '')}`
        );
    }
    return ret;
}

/**
 * Parse a specific comment annotation
 * @param {String=} commentComparator
 * @return {{negate: Boolean=, comparator: String=}}
 */
function prepareComment(commentComparator) {
    if (!commentComparator) {
        return {};
    }

    const negate = commentComparator.startsWith('!');
    return {
        negate,
        comparator: negate ? commentComparator.slice(1) : commentComparator
    };
}

/**
 * Prepares single condition.
 * @param {{Type: string, Test: *=}} element
 * @return {{negate: boolean, element: *}}
 */
function prepareSingleCondition(element) {
    const negate = element.Type === 'Not';
    return {
        negate,
        element: negate ? element.Test : element
    };
}

/**
 * Prepare the type.
 * @param {{Type: String=, Headers: *=}} element
 * @return {string} the type, or ''
 */
function prepareType(element) {
    const hasHeader = ({ Headers }, key, value = true) => Headers.includes(key) && value;
    const hasAnyHeader = (element, keys, value = true) => keys.some((key) => hasHeader(element, key)) && value;

    const MAP_TYPE = {
        Exists() {
            return hasHeader(element, 'X-Attached', 'attachments');
        },
        Header() {
            return hasHeader(element, 'Subject', 'subject');
        },
        Address() {
            return hasHeader(element, 'From', 'sender') || hasAnyHeader(element, ['To', 'Cc', 'Bcc'], 'recipient');
        }
    };
    return (MAP_TYPE[element.Type] || (() => false))() || '';
}

/**
 * Parses the different ifs.
 * @param {{Type: String, Test: *, ...}[]} ifConditions
 * @param {String[]} [commentComparators = []] - if known, the commentComparators.
 * @return {{Type: Object, Comparator: *, ...}[]} a list of conditions.
 */
function parseIfConditions(ifConditions, commentComparators = []) {
    const conditions = [];

    for (let index = 0; index < ifConditions.length; index++) {
        const { comparator: commentComparator, negate: commentNegate } = prepareComment(commentComparators[index]);

        const { element, negate } = prepareSingleCondition(ifConditions[index]);

        if (commentComparator && commentNegate !== negate) {
            throw new UnsupportedRepresentationError('Comment and computed negation incompatible');
        }

        const type = prepareType(element);

        const { Match, Keys: values = [] } = element || {};
        if (type !== 'attachments' && !Match) {
            throw new UnsupportedRepresentationError('Unsupported test');
        }

        const comparator = type === 'attachments' ? 'Contains' : Match.Type;
        const params = buildSimpleParams(comparator, values, negate, commentComparator);

        conditions.push(buildSimpleCondition(type, comparator, params));
    }

    return conditions;
}

/**
 * Builds simple parameters.
 * @param {String} comparator
 * @param {(String|{Value: String, Type: String})[]} values
 * @param {Boolean} negate
 * @param {String} [commentComparator=] - if given, will improve the type determination.
 * @return {{Comparator: {value: String, label: String}, Values: String[]}}
 */
function buildSimpleParams(comparator, values, negate, commentComparator) {
    const unescapedValues = values.map((escaped) => {
        const value = unescapeVariables(escaped);
        if (typeof value !== 'string') {
            throw new UnsupportedRepresentationError(`Unsupported string ${value}`);
        }
        return value;
    });

    if (commentComparator === 'starts' || commentComparator === 'ends') {
        if (comparator !== 'Matches') {
            throw new UnsupportedRepresentationError(
                `Comment and computed comparator incompatible: ${comparator} instead of matches`
            );
        }

        return {
            Comparator: buildSimpleComparator(commentComparator[0].toUpperCase() + commentComparator.slice(1), negate),
            Values: unescapedValues.map((value) => {
                const unescaped = unescapeCharacters(value);

                if (commentComparator === 'ends') {
                    return unescaped.slice(1);
                }
                return unescaped.slice(0, -1);
            })
        };
    }

    if (commentComparator && comparator.toLowerCase() !== commentComparator) {
        // commentComparator is not required
        throw new UnsupportedRepresentationError(
            `Comment and computed comparator incompatible: ${comparator} instead of ${commentComparator}`
        );
    }

    return {
        Comparator: buildSimpleComparator(comparator, negate),
        Values: unescapedValues
    };
}

/**
 * Builds a simple condition.
 * @param {String} type - the type (must be in LABEL_KEY)
 * @param {String} comparator - the comparator.
 * @param {*} params - any other params.
 * @return {{Type: Object, Comparator: *, ...}}
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
 * @param {String} comparator - the comparator
 * @param {Boolean} negate - if true, the comparator will be negated.
 * @return {{value: String, label: String}}
 */
function buildSimpleComparator(comparator, negate) {
    const inverted = invert(MATCH_KEYS);
    if (!inverted[comparator]) {
        throw new InvalidInputError('Invalid match keys');
    }

    return buildLabelValueObject((negate ? '!' : '') + inverted[comparator]);
}

/**
 * Parse the then nodes to extract the actions.
 * @param {{Type, ...}[]} thenNodes - all the then nodes.
 * @return {{FileInto: String[], Mark: {Read: Boolean, Starred: Boolean}, Vacation: String=}}
 */
function parseThenNodes(thenNodes) {
    const actions = {
        FileInto: [],
        Mark: {
            Read: false,
            Starred: false
        }
    };

    const actionsMap = {
        Keep: () => {},
        Discard: () => actions.FileInto.push('trash'),
        AddFlag: ({ Flags }) =>
            (actions.Mark = { Read: Flags.includes('\\Seen'), Starred: Flags.includes('\\Flagged') }),
        FileInto({ Name }) {
            const unescapedName = unescapeVariables(Name);
            if (typeof unescapedName !== 'string') {
                throw new UnsupportedRepresentationError(`Unsupported string ${Name}`);
            }
            actions.FileInto.push(unescapedName);
        },
        Vacation({ Message }) {
            const unescapedMessage = unescapeVariables(Message);
            if (typeof unescapedMessage !== 'string') {
                throw new UnsupportedRepresentationError(`Unsupported string ${Message}`);
            }
            actions.Vacation = unescapedMessage;
        }
    };
    actionsMap['Vacation\\Vacation'] = actionsMap.Vacation;

    thenNodes.forEach((node) => {
        const type = node.Type;

        if (!actionsMap[type]) {
            throw new UnsupportedRepresentationError(`Unsupported filter representation: ${type}`);
        }

        actionsMap[type](node);
    });

    return actions;
}

/**
 * Transforms a tree into a simple representation.
 * @param {Object[]} tree - a list of sieve nodes.
 * @return {{Operator: {label: String, value: String}, Conditions: Object[], Actions: {FileInto: Array, Mark: {Read: Boolean, Starred: Boolean}}}}
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
