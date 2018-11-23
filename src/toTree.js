import { escapeCharacters, unique } from './commons';
import { MATCH_KEYS, OPERATOR_KEYS, TEST_NODES, V1, V2 } from './constants';
import { InvalidInputError } from './Errors';

/**
 * Validates and correct the received simple representation.
 * @param simple
 * @return {*}
 */
function correctSimpleRepresentation(simple) {
    if (['Operator', 'Conditions', 'Actions'].find((key) => !simple[key])) {
        throw new InvalidInputError('Invalid simple keys');
    }

    if (
        !// beware the !
        (simple.Operator instanceof Object && simple.Conditions instanceof Array && simple.Actions instanceof Object)
    ) {
        throw new InvalidInputError('Invalid simple data types');
    }

    if (!simple.Operator.label || !simple.Operator.value) {
        throw new InvalidInputError('Invalid simple operator');
    }

    for (const condition of simple.Conditions) {
        for (const key of ['Type', 'Comparator']) {
            const value = condition[key];
            if (!value || !value.label || !value.value) {
                throw new InvalidInputError('Invalid simple conditions');
            }
        }
        if (!condition.Values) {
            throw new InvalidInputError('Invalid simple conditions');
        }
    }

    if (
        !simple.Actions.FileInto ||
        !(simple.Actions.FileInto instanceof Array) ||
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
 * @param {string[]} headers
 * @param {string[]} keys
 * @param {string} match
 * @return {{Headers: string[], Keys: string[], Match: {Type: string}, Format: {Type: string}, Type: string, AddressPart: {Type: string}}}
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
 * @param {bool} read
 * @param {bool} starred
 * @return {{Flags: string[], Type: string}}
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
 * @param {string} message - the message to be sent.
 * @param {int} version - the sieve version.
 * @return {{Message: string, Args: {MIMEType: string}, Type: string}}
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
 * @param {string} name - the folder.
 * @return {{Name: string, Type: string}}
 */
function buildFileintoAction(name) {
    return {
        Name: name,
        Type: 'FileInto'
    };
}

/**
 * Builds a simple test.
 * @param {string[]} headers - a list of header.
 * @param {string[]} keys - the keys.
 * @param {string} match - the match value.
 * @return {{Headers: string[], Keys: string[], Match: {Type: string}, Format: {Type: string}, Type: string}}
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
 * @param {*} test an already computer test.
 * @return {{Test: *, Type: string}}
 */
function buildTestNegate(test) {
    return {
        Test: test,
        Type: 'Not'
    };
}

/**
 * Builds a require node.
 * @param {string[]} requires - the extensions to require.
 * @param {string[]} mandatory - the extensions to require anyway.
 * @return {{List: string[], Type: 'Require'}}
 */
function buildSieveRequire(requires, mandatory = ['fileinto', 'imap4flags']) {
    return {
        List: unique([...mandatory, ...requires]),
        Type: 'Require'
    };
}

/**
 * Builds the tree.
 * @param {{requires: string[], comparators: string[], type: string, tests: {}, thens: []}} parameters - the different parameters.
 * @param {int} version - the sieve version.
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
 * @param {string[]} comparators - the comparators.
 * @param {string} type - the type. Either AllOf or AnyOf
 * @return {{Text: string, Type: string}}
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
 * @param {string} comparator
 * @param {{Values: string}} condition
 * @return {{match: string, values: string[]}}
 */
function buildMatchAndValues(comparator, condition) {
    // starts and ends does not exists in sieve. Replacing it to match.
    condition.Values = condition.Values.map((value) => {
        const escaped = escapeCharacters(value);
        switch (comparator) {
            case 'starts':
                return ''.concat(escaped, '*');
            case 'ends':
                return ''.concat('*', value);
            default:
                return value;
        }
    });

    comparator = comparator === 'starts' || comparator === 'ends' ? 'matches' : comparator;

    return {
        match: MATCH_KEYS[comparator],
        values: unique(condition.Values)
    };
}

/**
 * Transforms a simple representation to a filter tree.
 * @param {{}} simple - the filter representation.
 * @param {int=1} version - the version, either 1 or 2.
 * @return {Array}
 */
export const toTree = (simple, version) => {
    simple = correctSimpleRepresentation(simple);
    simple = JSON.parse(JSON.stringify(simple));

    const type = OPERATOR_KEYS[simple.Operator.value];
    const tests = [];
    const thenBlocks = [];
    const requires = [];
    const comparators = [];

    for (const condition of simple.Conditions) {
        let comparator = condition.Comparator.value;
        let comment = comparator;

        // if the type is attachment, then the value have to be changed from  [!]contains to [!]default
        if (condition.Type.value === 'attachments') {
            comment = (comment.startsWith('!') ? '!' : '') + 'default';
        }
        comparators.push(comment);

        const negate = comparator.startsWith('!');
        if (negate) {
            comparator = comparator.substring(1);
        }

        if (!MATCH_KEYS[comparator] || MATCH_KEYS[comparator] === MATCH_KEYS.default) {
            throw new InvalidInputError('Unrecognized simple condition: ' + condition.Comparator.value);
        }

        const { match, values } = buildMatchAndValues(comparator, condition);

        const conditionMap = {
            sender: () => buildAddressTest(['From'], values, match),
            recipient: () => buildAddressTest(['To', 'Cc', 'Bcc'], values, match),
            subject: () => buildSimpleHeaderTest(['Subject'], values, match),
            attachments: () => TEST_NODES.attachment[0]
        };

        const test = conditionMap[condition.Type.value] && conditionMap[condition.Type.value]();

        tests.push(negate ? buildTestNegate(test) : test);
    }

    // FileInto:
    for (const destination of Object.values(simple.Actions.FileInto)) {
        if (destination) {
            thenBlocks.push(buildFileintoAction(destination));
        }
    }

    // Mark: (needs to only be included if flags are not false)
    if (simple.Actions.Mark.Read || simple.Actions.Mark.Starred) {
        thenBlocks.push(buildSetflagThen(simple.Actions.Mark.Read, simple.Actions.Mark.Starred));
        thenBlocks.push({
            Type: 'Keep'
        });
    }

    if (simple.Actions.Vacation) {
        requires.push('vacation');
        thenBlocks.push(buildVacationAction(simple.Actions.Vacation, version));
    }

    return buildBasicTree(
        {
            type,
            tests,
            thens: thenBlocks,
            requires,
            comparators
        },
        version
    );
};
