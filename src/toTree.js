import { escapeCharacters, escapeVariables, unique } from './commons';
import { MATCH_KEYS, OPERATOR_KEYS, TEST_NODES, V1, V2 } from './constants';
import { InvalidInputError } from './Errors';

/**
 * Validates the received simple representation.
 * @param {{Operator: *, Conditions: *, Actions: *}} simple
 * @return {{Operator: Object, Conditions: Array, Actions: Object}}
 */
function validateSimpleRepresentation(simple) {
    if (['Operator', 'Conditions', 'Actions'].some((key) => !simple[key])) {
        throw new InvalidInputError('Invalid simple keys');
    }

    if (
        !/* beware the not */ (
            simple.Operator instanceof Object &&
            Array.isArray(simple.Conditions) &&
            simple.Actions instanceof Object
        )
    ) {
        throw new InvalidInputError('Invalid simple data types');
    }

    if (!simple.Operator.label || !simple.Operator.value) {
        throw new InvalidInputError('Invalid simple operator');
    }

    simple.Conditions.forEach((condition) => {
        if (
            ['Type', 'Comparator'].some((key) => {
                const value = condition[key];
                return !value || !value.label || !value.value;
            })
        ) {
            throw new InvalidInputError('Invalid simple conditions');
        }

        if (!condition.Values) {
            throw new InvalidInputError('Invalid simple conditions');
        }

        const { comparator } = prepareComparator(condition.Comparator.value);
        if (!MATCH_KEYS[comparator] || MATCH_KEYS[comparator] === MATCH_KEYS.default) {
            throw new InvalidInputError('Unrecognized simple condition: ' + condition.Comparator.value);
        }
    });

    if (
        !simple.Actions.FileInto ||
        !Array.isArray(simple.Actions.FileInto) ||
        !simple.Actions.Mark ||
        typeof simple.Actions.Mark.Read === 'undefined' ||
        typeof simple.Actions.Mark.Starred === 'undefined'
    ) {
        throw new InvalidInputError('Invalid simple actions');
    }

    return simple;
}

/**
 * Builds an address test.
 * @param {String[]} headers
 * @param {String[]} keys
 * @param {String} match
 * @return {{Headers: String[], Keys: String[], Match: {Type: String}, Type: String, AddressPart: {Type: String}}}
 */
function buildAddressTest(headers, keys, match) {
    return {
        Headers: headers,
        Keys: keys,
        Match: {
            Type: match
        },
        Format: {
            Type: 'UnicodeCaseMap'
        },
        Type: 'Address',
        AddressPart: {
            Type: 'All'
        }
    };
}

/**
 * Builds a setflag action, for read or starred.
 * @param {Boolean} read
 * @param {Boolean} starred
 * @return {{Flags: String[], Type: String}}
 */
function buildSetflagThen(read, starred) {
    const flags = [];
    if (read) {
        flags.push('\\Seen');
    }
    if (starred) {
        flags.push('\\Flagged');
    }
    return {
        Flags: flags,
        Type: 'AddFlag'
    };
}

/**
 * Builds a vacation action.
 * @param {String|{Type: string, Value: string}} message - the message to be sent.
 * @param {Number} version - the sieve version.
 * @return {{Message: String, Args: {MIMEType: String}, Type: String}}
 */
function buildVacationAction(message, version) {
    return {
        Message: message,
        Args: { MIMEType: 'text/html' },
        Type: version === V1 ? 'Vacation\\Vacation' : 'Vacation'
    };
}

/**
 * Builds a fileinto action.
 * @param {String|{Type: String, Value: String}} name - the folder.
 * @return {{Name: String, Type: String}}
 */
function buildFileintoAction(name) {
    return {
        Name: name,
        Type: 'FileInto'
    };
}

/**
 * Builds a simple test.
 * @param {String[]} headers - a list of header.
 * @param {String[]} keys - the keys.
 * @param {String} match - the match value.
 * @return {{Headers: String[], Keys: String[], Format: {Type: String}, Type: String}}
 */
function buildSimpleHeaderTest(headers, keys, match) {
    return {
        Headers: headers,
        Keys: keys,
        Match: {
            Type: match // The value can be removed if needed, it's backend compatible.
        },
        Format: {
            Type: 'UnicodeCaseMap'
        },
        Type: 'Header'
    };
}

/**
 * Negates a given test.
 * @param {T} test an already computer test.
 * @return {{Test: T, Type: String}}
 * @template T
 */
function buildTestNegate(test) {
    return {
        Test: test,
        Type: 'Not'
    };
}

/**
 * Builds a require node.
 * @param {String[]} requires - the extensions to require.
 * @param {String[]} mandatory - the extensions to require anyway.
 * @return {{List: String[], Type: String}}
 */
function buildSieveRequire(requires, mandatory = ['fileinto', 'imap4flags']) {
    return {
        List: unique([...mandatory, ...requires]),
        Type: 'Require'
    };
}

/**
 * Builds the tree.
 * @param {{requires: String[], comparators: String[], type: String, tests: Object[], thens: [], dollarNeeded: Boolean}} parameters - the different parameters.
 * @param {Number} version - the sieve version.
 * @return {Array}
 */
function buildBasicTree(parameters, version) {
    const treeStructure = [];
    if (version === V2) {
        treeStructure.push(
            buildSieveRequire(
                ['include', 'environment', 'variables', 'relational', 'comparator-i;ascii-numeric', 'spamtest'],
                []
            )
        );
    }

    treeStructure.push(buildSieveRequire(parameters.requires));

    if (version === V2) {
        treeStructure.push(...TEST_NODES.spamtest);

        if (parameters.dollarNeeded) {
            treeStructure.push(...TEST_NODES.dollar);
        }

        treeStructure.push(buildComparatorComment(parameters.comparators, parameters.type));
    }

    treeStructure.push({
        If: {
            Tests: parameters.tests,
            Type: parameters.type
        },
        Then: parameters.thens,
        Type: 'If'
    });
    return treeStructure;
}

/**
 * Build the comment node from a comparator.
 * @param {String[]} comparators - the comparators.
 * @param {String} type - the type. Either AllOf or AnyOf
 * @return {{Text: String, Type: String}}
 */
function buildComparatorComment(comparators, type) {
    const commentArray = ['/**'];

    if (type === 'AllOf') {
        commentArray.push(' @type and');
    } else if (type === 'AnyOf') {
        commentArray.push(' @type or');
    } else {
        throw new TypeError('Undefined type ' + type);
    }

    commentArray.push(...comparators.map((comparator) => ' @comparator ' + comparator));

    commentArray.push('/');
    return {
        Text: commentArray.join('\r\n *'),
        Type: 'Comment'
    };
}

/**
 * Build match and values from comparator and condition.
 * @param {String} comparator
 * @param {{Values: String[]}} condition
 * @return {{match: String, values: String[]}}
 */
function buildMatchAndValues(comparator, condition) {
    // starts and ends does not exists in sieve. Replacing it to match.
    const values = condition.Values.map((value) => {
        const escaped = escapeCharacters(value);
        if (comparator === 'starts') {
            return ''.concat(escaped, '*');
        }

        if (comparator === 'ends') {
            return ''.concat('*', escaped);
        }

        return value;
    });

    return {
        values,
        match: MATCH_KEYS[comparator === 'starts' || comparator === 'ends' ? 'matches' : comparator]
    };
}

/**
 * Prepare comparator.
 * @param {String} comparator
 * @return {{comparator: String, negate: Boolean}}
 */
function prepareComparator(comparator) {
    if (comparator.startsWith('!')) {
        return {
            negate: true,
            comparator: comparator.substring(1)
        };
    }
    return {
        comparator,
        negate: false
    };
}

/**
 * Prepare the comment.
 * @param {String} comparator the comparator.
 * @param {String} type the type of the current node.
 * @param {Boolean} negate the boolean.
 * @return {String}
 */
function prepareComment(comparator, type, negate) {
    const negation = negate ? '!' : '';
    if (type === 'attachments') {
        return negation + 'default';
    }
    return negation + comparator;
}

/**
 * Builds condition block.
 * @param {Object[]} conditions
 * @return {{test: Array, comparators: String[], dollarNeeded: Boolean=}}
 */
function buildCondition(conditions) {
    return conditions.reduce(
        (acc, condition) => {
            const { comparator, negate } = prepareComparator(condition.Comparator.value);
            const comparators = [...acc.comparators, prepareComment(comparator, condition.Type.value, negate)];

            const { match, values: matchValues } = buildMatchAndValues(comparator, condition);
            const values = matchValues.map(escapeVariables);
            const conditionMap = {
                sender: () => buildAddressTest(['From'], values, match),
                recipient: () => buildAddressTest(['To', 'Cc', 'Bcc'], values, match),
                subject: () => buildSimpleHeaderTest(['Subject'], values, match),
                attachments: () => TEST_NODES.attachment[0]
            };

            const dollarNeeded = acc.dollarNeeded || values.some((value) => typeof value !== 'string');

            const test = conditionMap[condition.Type.value] && conditionMap[condition.Type.value]();
            const tests = [...acc.tests, negate ? buildTestNegate(test) : test];

            return { comparators, dollarNeeded, tests };
        },
        {
            tests: [],
            comparators: [],
            dollarNeeded: false
        }
    );
}

/**
 * Builds fileinto blocks.
 * @param actions
 * @return {{dollarNeeded: Boolean=, blocks: Array}}
 */
function buildFileInto(actions) {
    return actions.reduce(
        (acc, destination) => {
            if (destination) {
                destination = escapeVariables(destination);

                return {
                    dollarNeeded: acc.dollarNeeded || typeof destination === 'object',
                    blocks: [...acc.blocks, buildFileintoAction(destination)]
                };
            }
            return acc;
        },
        {
            dollarNeeded: false,
            blocks: []
        }
    );
}

/**
 * Builds mark blocks.
 * @param {{Read: Boolean=, Starred: Boolean=}} node
 * @return {{ blocks: Array}}
 */
function buildMark({ Read: read, Starred: starred }) {
    if (!read && !starred) {
        return { blocks: [] };
    }

    return { blocks: [buildSetflagThen(read, starred), { Type: 'Keep' }] };
}

/**
 * Build vacation blocks.
 * @param vacation
 * @param version
 * @return {{dollarNeeded: Boolean=, blocks: Array}}
 */
function buildVacation(vacation, version) {
    if (!vacation) {
        return { blocks: [] };
    }

    const message = escapeVariables(vacation);
    return {
        blocks: [buildVacationAction(message, version)],
        dollarNeeded: typeof message === 'object'
    };
}

/**
 * Transforms a simple representation to a filter tree.
 * @param {{}} simple - the filter representation.
 * @param {Number} [version=1] - the version, either 1 or 2.
 * @return {Array}
 */
export const toTree = (simple, version) => {
    validateSimpleRepresentation(simple);

    const condition = buildCondition(simple.Conditions);
    const fileInto = buildFileInto(simple.Actions.FileInto);
    const mark = buildMark(simple.Actions.Mark);
    const vacation = buildVacation(simple.Actions.Vacation, version);

    return buildBasicTree(
        {
            type: OPERATOR_KEYS[simple.Operator.value],
            requires: vacation.blocks.length ? ['vacation'] : [],
            tests: condition.tests,
            comparators: condition.comparators,
            dollarNeeded: condition.dollarNeeded || fileInto.dollarNeeded || vacation.dollarNeeded,
            thens: [...fileInto.blocks, ...mark.blocks, ...vacation.blocks]
        },
        version
    );
};
