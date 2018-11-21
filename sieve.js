/*
 * sieve.js
 * Sieve/Tree representation builder
 */

var Sieve = (function() {
    var V1 = 1;
    var V2 = 2;

    var DEBUG = false;

    var MATCH_KEYS = {
        is: 'Is',
        contains: 'Contains',
        matches: 'Matches',
        starts: 'Starts',
        ends: 'Ends'
    };

    var OPERATOR_KEYS = {
        all: 'AllOf',
        any: 'AnyOf'
    };

    var LABEL_KEYS = {
        all: 'All',
        any: 'Any',
        subject: 'Subject',
        sender: 'Sender',
        recipient: 'Recipient',
        attachments: 'Attachments',
        contains: 'contains',
        '!contains': 'does not contain',
        is: 'is exactly',
        '!is': 'is not',
        matches: 'matches',
        '!matches': 'does not match',
        starts: 'begins with',
        '!starts': 'does not begin with',
        ends: 'ends with',
        '!ends': 'does not end with'
    };

    function escapeCharacters(text) {
        return text.replace(/([*?])/g, '\\\\$1');
    }

    /**
     * Overwrites object1's values with object2's and/or adds object2's attributes if missing in object1
     */
    function mergeObjects(object1, object2) {
        var merged = {};
        for (var attrname in object1) { merged[attrname] = object1[attrname]; }
        for (attrname in object2) { merged[attrname] = object2[attrname]; }
        return merged;
    }

    function validateSimpleRepresentation(simple) {
        var pass = true;

        pass = pass && simple.hasOwnProperty('Operator');
        pass = pass && simple.hasOwnProperty('Conditions');
        pass = pass && simple.hasOwnProperty('Actions');

        if (!pass) {
            throw { name: 'InvalidInput', message: 'Invalid simple keys' };
        }

        pass = pass && simple.Operator   instanceof Object;
        pass = pass && simple.Conditions instanceof Array;
        pass = pass && simple.Actions    instanceof Object;

        if (!pass) {
            throw { name: 'InvalidInput', message: 'Invalid simple data types' };
        }

        pass = pass && simple.Operator.hasOwnProperty('label');
        pass = pass && simple.Operator.hasOwnProperty('value');

        if (!pass) {
            throw { name: 'InvalidInput', message: 'Invalid simple operator' };
        }

        for (var index in simple.Conditions) {
            var condition = simple.Conditions[index];

            pass = pass && condition.hasOwnProperty('Type');
            pass = pass && condition.Type.hasOwnProperty('label');
            pass = pass && condition.Type.hasOwnProperty('value');

            pass = pass && condition.hasOwnProperty('Comparator');
            pass = pass && condition.Comparator.hasOwnProperty('label');
            pass = pass && condition.Comparator.hasOwnProperty('value');

            pass = pass && condition.hasOwnProperty('Values');
        }

        if (!pass) {
            throw { name: 'InvalidInput', message: 'Invalid simple conditions' };
        }

        pass = pass && simple.Actions.hasOwnProperty('FileInto');
        pass = pass && simple.Actions.FileInto instanceof Array;

        pass = pass && simple.Actions.hasOwnProperty('Mark');
        pass = pass && simple.Actions.Mark.hasOwnProperty('Read');
        pass = pass && simple.Actions.Mark.hasOwnProperty('Starred');

        if (!pass) {
            throw { name: 'InvalidInput', message: 'Invalid simple actions' };
        }

        return simple;
    }

    // Convert to Tree representation
    function toTree(simple, version)
    {
        simple = validateSimpleRepresentation(simple);
        simple = JSON.parse(JSON.stringify(simple));

        var type = OPERATOR_KEYS[simple.Operator.value];
        var tests = [];
        var thens = [];
        var requires = [];
        var vacation = {};
        var comparators = [];

        for (var index in simple.Conditions)
        {
            var condition = simple.Conditions[index];
            var comparator = condition.Comparator.value;
            var test = null;
            var negate = false;

            comparators.push(comparator);

            switch (comparator)
            {
                case 'contains':
                case 'is':
                case 'matches':
                case 'starts':
                case 'ends':
                    break;

                case '!contains':
                case '!is':
                case '!matches':
                case '!starts':
                case '!ends':
                    comparator = comparator.substring(1);
                    negate = true;
                    break;

                default:
                    throw { name: 'InvalidInput', message: 'Unrecognized simple condition: ' + condition.Comparator.value};
            }

            for (var v in condition.Values)
            {
                var value = condition.Values[v];
                // Escape on Simple rep. 'matches', 'begins' and 'ends' which maps to Tree 'Matches'
                switch (comparator)
                {
                    case 'starts':
                        value = escapeCharacters(value);
                        condition.Values[v] = ''.concat(value, '*');
                        break;

                    case 'ends':
                        value = escapeCharacters(value);
                        condition.Values[v] = ''.concat('*', value);
                        break;
                }
            }

            comparator = comparator === 'starts' || comparator === 'ends' ? 'matches' : comparator;

            var match = MATCH_KEYS[comparator];
            var values = unique(condition.Values);

            switch(condition.Type.value)
            {
                case 'sender':
                    test = buildAddressTest(['From'], values, match);
                    break;

                case 'recipient':
                    test = buildAddressTest(['To', 'Cc', 'Bcc'], values, match);
                    break;

                case 'subject':
                    test = buildHeaderTest(['Subject'], values, match);
                    break;

                case 'attachments':
                    test = buildAttachmentTest();
                    break;
            }

            if (negate) test = buildTestNegate(test);
            tests.push(test);
        }

        // FileInto:
        for (var index in simple.Actions.FileInto)
        {
            var destination = simple.Actions.FileInto[index];
            if (destination != null) {
                thens.push(buildFileintoThen(destination));
            }
        }

        // Mark: (needs to only be included if flags are not false)
        if (simple.Actions.Mark.Read !== false || simple.Actions.Mark.Starred !== false) {
            thens.push(buildSetflagThen(simple.Actions.Mark.Read, simple.Actions.Mark.Starred));
            thens.push({
                Type: 'Keep'
            });
        }

        if (simple.Actions.Vacation) {
            requires.push('vacation');
            thens.push(buildVacation(simple.Actions.Vacation));
        }

        return buildBasicTree(
            {
                type: type,
                tests: tests,
                thens: thens,
                requires: requires,
                comparators: comparators
            },
            version
        );
    }

    function fromTree(tree) {
        var validated = validateTree(tree);
        tree = validated.tree;
        tree = JSON.parse(JSON.stringify(tree));

        var simple = {
            Operator: {},
            Conditions: [],
            Actions: {}
        };

        var comment = iterateComparator(validated.comment);

        var operator = invert(OPERATOR_KEYS)[tree.If.Type];
        simple.Operator.label = LABEL_KEYS[operator];
        simple.Operator.value = operator;

        if (comment && comment.type && operator !== comment.type) {
            throw {name: 'UnsupportedRepresentation', message: 'Comment and computed type incompatible'};
        }

        var conditions = iterateCondition(tree.If.Tests, comment && comment.comparators);
        simple.Conditions = simple.Conditions.concat(conditions);

        simple.Actions = iterateAction(tree.Then);

        return simple;
    }

    function validateTree(tree) {
        var string = '';

        var mainNode = null;
        var requiredExtensions = ['fileinto', 'imap4flags'];
        var comment = null;
        if (tree instanceof Array) {
            var treeLength = tree.length;
            for (var i = 0; i < treeLength; i++) {
                var node = tree[i];
                if (node.Type === 'Require') {

                    var extensionIndex = requiredExtensions.length;
                    while (extensionIndex--) {
                        var extension = requiredExtensions[extensionIndex];
                        if (node.List.indexOf(extension) >= 0) {
                            requiredExtensions.splice(extensionIndex, 1);
                        }
                    }
                } else if (node.Type === 'If') {
                    var pass = true;

                    if (pass) {
                        pass = pass && node.hasOwnProperty('If');
                        string = 'If';
                    }
                    // FIXME Figure out whether this is necessary
                    if (pass) {
                        pass = pass && node.If.hasOwnProperty('Tests');
                        string = 'Tests';
                    }
                    if (pass) {
                        pass = pass && node.hasOwnProperty('Then');
                        string = 'Then';
                    }
                    if (pass) {
                        pass = pass && node.hasOwnProperty('Type');
                        string = 'Type';
                    }
                    if (pass) {
                        mainNode = node;
                    }
                } else if (node.Type === 'Comment' && node.Text.match(/^\/\*\*\r\n(?:\s\*\s@(?:type|comparator)[^\r]+\r\n)+\s\*\/$/)) {
                    comment = node;
                }
            }

            if (requiredExtensions.length) {
                throw {name: 'InvalidInput', message: 'Invalid tree representation: requirements'};
            }
        }

        if (!mainNode) {
            throw { name: 'InvalidInput', message: 'Invalid tree representation: ' + string + ' level' };
        }

        return {tree: mainNode, comment: comment};
    }

    function iterateComparator(comparator) {
        if (!comparator) {
            return null;
        }

        var text = comparator.Text;
        var chunks = text.split('\r\n *');
        chunks = chunks.splice(1, chunks.length - 2);

        var type = null;
        var comparators = [];
        chunks.forEach(function (chunk) {
            var res = chunk.match(/\s@(\w*)\s(.*)$/);
            if (res) {
                var annotationType = res[1];
                var value = res[2];

                if (annotationType === 'type') {
                    type = value;
                } else if (annotationType === 'comparator') {
                    comparators.push(value);
                }
            }
        });

        if (type === 'and') {
            type = 'all';
        } else if (type === 'or') {
            type = 'any';
        }
        return {type: type, comparators: comparators};
    }

    function buildSimpleParams(comparator, values, negate, commentComparator) {
        if (commentComparator) {
            if (commentComparator === 'starts' || commentComparator === 'ends') {
                if (comparator !== 'Matches') {
                    throw {
                        name: 'UnsupportedRepresentation',
                        message: `Comment and computed comparator incompatible: ${comparator} instead of matches`
                    };
                }
                comparator = commentComparator[0].toUpperCase() + commentComparator.slice(1);
                values = values.map(function (value) {
                        if (commentComparator === 'ends') {
                            return value.replace(/^\*+/g, '');
                        }
                        return value.replace(/\*+$/g, '');
                    }
                );
            } else {
                if (comparator.toLowerCase() !== commentComparator) {
                    throw {
                        name: 'UnsupportedRepresentation',
                        message: `Comment and computed comparator incompatible: ${comparator} instead of ${commentComparator}`
                    };
                }
            }
        }

        comparator = buildSimpleComparator(comparator, negate);

        return {
            Comparator: comparator,
            Values: values
        };
    }

    function iterateCondition(array, commentComparators) {
        if (!commentComparators) {
            commentComparators = [];
        }
        var conditions = [];

        for (var index = 0; index < array.length; index++) {
            var element = array[index];
            var commentComparator = commentComparators[index];
            var commentNegate = undefined;
            if (commentComparator) {
                commentNegate = commentComparator.startsWith('!');
                if (commentNegate) {
                    commentComparator = commentComparator.slice(1);
                }
            }

            var negate = false;
            if (element.Type === 'Not') {
                negate = true;
                element = element.Test;
            }

            if (commentNegate != null && commentNegate !== negate) {
                throw {
                    name: 'UnsupportedRepresentation',
                    message: `Comment and computed negation incompatible`
                };
            }

            var type = null;
            var params = null;

            switch (element.Type)
            {
                case 'Exists':
                    if (element.Headers.indexOf('X-Attached') >= 0) {
                        type = 'attachments';
                    }
                    break;

                case 'Header':
                    if (element.Headers.indexOf('Subject') >= 0) {
                        type = 'subject';
                    }
                    break;

                case 'Address':
                    if (element.Headers.indexOf('From') >= 0) {
                        type = 'sender';
                    }
                    else if (element.Headers.indexOf('To') >= 0) {
                        type = 'recipient';
                    }
                    else if (element.Headers.indexOf('Cc')  >= 0) {
                        type = 'recipient';
                    }
                    else if (element.Headers.indexOf('Bcc') >= 0) {
                        type = 'recipient';
                    }
                    break;
            }
            var comparator = type === 'attachments' ? 'Contains' : element.Match.Type;
            var values = (element.Keys !== undefined) ? element.Keys : [];

            params = buildSimpleParams(comparator, values, negate, commentComparator);

            conditions.push(buildSimpleCondition(type, comparator, params));
        }

        return conditions;
    }

    function iterateAction(array) {
        var actions = buildSimpleActions();
        var labelindex = null;

        for (var index in array) {
            var skip = false;
            var element = array[index];
            var params = null;

            switch (element.Type) {
                case 'Reject':
                    throw { name: 'UnsupportedRepresentation', message: 'Unsupported filter representation: Reject' };

                case 'Redirect':
                    throw { name: 'UnsupportedRepresentation', message: 'Unsupported filter representation: Redirect' };

                case 'Keep':
                    break;

                case 'Discard':
                    actions.FileInto.push('trash');
                    break;

                case 'FileInto':
                    var name = element.Name;
                    actions.FileInto.push(name);
                    break;

                case 'AddFlag':
                    var read = (element.Flags.indexOf('\\Seen') >= 0);
                    var starred = (element.Flags.indexOf('\\Flagged') >= 0);

                    actions.Mark = {
                        Read: read,
                        Starred: starred
                    };
                    break;

                case 'Vacation\\Vacation':
                    actions.Vacation = element.Message;
                    break;

                default:
                    throw { name: 'UnsupportedRepresentation', message: 'Unsupported filter representation: ' + element.Type };
            }

            if (skip) continue;
        }

        return actions;
    }

    // Public interface
    // ================

    // Public interface to the toTree() function
    function ToTree(modal, version = V1) {

        try {
            return toTree(modal, version);
        } catch (exception) {
            if (DEBUG) {
                console.error(exception);
            }
            return [];
        }
    }

    // Public interface to the fromTree() function
    function FromTree(tree) {
        try {
            return fromTree(tree);
        } catch (exception) {
            if (DEBUG) {
                console.error(exception);
            }
            return {};
        }
    }

    // Generic helper functions
    // ========================

    function invert(object) {
        var inverted = {};

        for (var property in object) {
            if(object.hasOwnProperty(property)) {
                inverted[object[property]] = property;
            }
        }

        return inverted;
    }

    function unique(array) {
        return array.filter(function(item, pos, self) {
            return self.indexOf(item) === pos;
        });
    }

    // Tree representation helpers
    // ===========================
    // @internal Helper functions for building backend filter representation trees from the frontend modal

    function buildComparatorComment(comparators, type) {
        var commentArray = ['/**'];

        if (type === 'AllOf') {
            commentArray.push(' @type and');
        } else if (type === 'AnyOf') {
            commentArray.push(' @type or');
        } else {
            throw new Error('Undefined type ' + type);
        }

        Array.prototype.push.apply(commentArray, comparators.map(function (comparator) {
            return ' @comparator ' + comparator;
        }));

        commentArray.push('/');
        return {
            Text: commentArray.join('\r\n *'),
            Type: 'Comment'
        };
    }

    function buildBasicTree(parameters, version) {
        var treeStructure = [];
        if (version === V2) {
            treeStructure.push(buildSieveRequire(
                [
                    'include',
                    'environment',
                    'variables',
                    'relational',
                    'comparator-i;ascii-numeric',
                    'spamtest'
                ],
                []
            ));
        }
        treeStructure.push(buildSieveRequire(parameters.requires));

        if (version === V2) {
            Array.prototype.push.apply(treeStructure, buildSpamtestTest());
            treeStructure.push(buildComparatorComment(parameters.comparators, parameters.type));
        }

        treeStructure.push({
            If:
                {
                    Tests: parameters.tests,
                    Type: parameters.type
                },
            Then: parameters.thens,
            Type: 'If'
        });
        return treeStructure;
    }

    function buildSpamtestTest() {
        return [
            {
                'Text': '# Generated: Do not run this script on spam messages\n',
                'Type': 'Comment'
            }, {
                'If': {
                    'Tests': [
                        {
                            'Name': 'vnd.proton.spam-threshold',
                            'Keys': [
                                '*'
                            ],
                            'Format': null,
                            'Match': {
                                'Type': 'Matches'
                            },
                            'Type': 'Environment'
                        },
                        {
                            'Value': {
                                'Value': '${1}',
                                'Type': 'VariableString'
                            },
                            'Flags': [],
                            'Format': {
                                'Type': 'ASCIINumeric'
                            },
                            'Match': {
                                'Comparator': 'ge',
                                'Type': 'GreaterEqualsValue'
                            },
                            'Type': 'SpamTest'
                        }
                    ],
                    'Type': 'AllOf'
                },
                'Then': [
                    {
                        'Type': 'Return'
                    }
                ],
                'Type': 'If'
            }
        ];
    }

    function buildTestNegate(test) {
        return {
            Test: test,
            Type: 'Not'
        };
    }

    function buildSieveRequire(requires, mandatory = ['fileinto', 'imap4flags'])
    {
        return {
            List: mandatory.concat(requires),
            Type: 'Require'
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

    function buildAddressTest(headers, keys, match) {
        var addresspart = 'All'; // FIXME Matching to the whole address for now
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
                Type: addresspart
            }
        };
    }

    function buildAttachmentTest() {
        return {
            Headers:['X-Attached'],
            Type:'Exists'
        };
    }

    function buildSetflagThen(read, starred) {
        var flags = [];
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

    function buildVacation(message) {
        return {
            Message: message,
            Args: { MIMEType: 'text/html' },
            Type: 'Vacation\\Vacation'
        };
    }

    function buildFileintoThen(name) {
        return {
            Name: name,
            Type: 'FileInto'
        };
    }

    // Simple representation helpers
    // =============================
    // @internal Helper functions for building frontend filter modal from the backend representation

    function buildSimpleComparator(comparator, negate) {
        comparator = invert(MATCH_KEYS)[comparator];

        if (comparator == null) {
            throw { name: 'InvalidInput', message: 'Invalid match keys' };
        }

        if (negate) comparator = '!' + comparator;

        return buildLabelValueObject(comparator);
    }

    function buildLabelValueObject(value) {
        return {
            label: LABEL_KEYS[value],
            value: value
        };
    }

    function buildSimpleCondition(type, comparator, params) {
        var condition = {
            Type: buildLabelValueObject(type),
            Comparator: buildLabelValueObject(comparator)
        };
        return mergeObjects(condition, params);
    }

    function buildSimpleActions() {
        return {
            FileInto: [],
            Mark: {
                Read: false,
                Starred: false
            }
        };
    }

    return {
        fromTree: FromTree,
        toTree: ToTree
    };
}());

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Sieve;
}
