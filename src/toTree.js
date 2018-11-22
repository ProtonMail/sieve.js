import { escapeCharacters, unique } from './commons';
import { MATCH_KEYS, OPERATOR_KEYS, TEST_NODES, V1, V2 } from './constants';
import { InvalidInputError } from './Errors';

function validateSimpleRepresentation(simple) {
    if (['Operator', 'Conditions', 'Actions'].find((key) => !simple[key])) {
        throw new InvalidInputError('Invalid simple keys');
    }

    if (
        !(simple.Operator instanceof Object && simple.Conditions instanceof Array && simple.Actions instanceof Object)
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

function buildVacation(message, version) {
    return {
        Message: message,
        Args: { MIMEType: 'text/html' },
        Type: version === V1 ? 'Vacation\\Vacation' : 'Vacation'
    };
}

function buildFileintoThen(name) {
    return {
        Name: name,
        Type: 'FileInto'
    };
}

function buildHeaderTest(headers, keys, match) {
    return {
        Headers: headers,
        Keys: keys,
        Match: {
            Type: match
        },
        Format: {
            Type: 'UnicodeCaseMap'
        },
        Type: 'Header'
    };
}

function buildTestNegate(test) {
    return {
        Test: test,
        Type: 'Not'
    };
}

function buildSieveRequire(requires, mandatory = ['fileinto', 'imap4flags']) {
    return {
        List: unique([...mandatory, ...requires]),
        Type: 'Require'
    };
}

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

export const toTree = (simple, version) => {
    simple = validateSimpleRepresentation(simple);
    simple = JSON.parse(JSON.stringify(simple));

    const type = OPERATOR_KEYS[simple.Operator.value];
    const tests = [];
    const thenBlocks = [];
    const requires = [];
    const comparators = [];

    for (const condition of simple.Conditions) {
        let comparator = condition.Comparator.value;
        let comment = comparator;

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

        const match = MATCH_KEYS[comparator];
        const values = unique(condition.Values);

        const conditionMap = {
            sender: () => buildAddressTest(['From'], values, match),
            recipient: () => buildAddressTest(['To', 'Cc', 'Bcc'], values, match),
            subject: () => buildHeaderTest(['Subject'], values, match),
            attachments: () => TEST_NODES.attachment[0]
        };

        const test = conditionMap[condition.Type.value] && conditionMap[condition.Type.value]();

        tests.push(negate ? buildTestNegate(test) : test);
    }

    // FileInto:
    for (const destination of Object.values(simple.Actions.FileInto)) {
        if (destination) {
            thenBlocks.push(buildFileintoThen(destination));
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
        thenBlocks.push(buildVacation(simple.Actions.Vacation, version));
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
