/*
 * sieve.js
 * Sieve/Tree representation builder
 */

var Sieve = (function () {
    var V1 = 1;
    var V2 = 2;

    var DEBUG = false;

    var MATCH_KEYS = {
        is: 'Is',
        contains: 'Contains',
        matches: 'Matches'
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
    function toTree (simple, version)
    {
        simple = validateSimpleRepresentation(simple);
        simple = JSON.parse(JSON.stringify(simple));

        var type = OPERATOR_KEYS[simple.Operator.value];
        var tests = [];
        var thens = [];
        var requires = [];
        var vacation = {};

        for (var index in simple.Conditions)
        {
            var condition = simple.Conditions[index];
            var comparator = condition.Comparator.value;
            var test = null;
            var negate = false;

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
                    header = ['From'];
                    test = buildAddressTest(header, values, match);
                    break;

                case 'recipient':
                    header = ['To', 'Cc', 'Bcc'];
                    test = buildAddressTest(header, values, match);
                    break;

                case 'subject':
                    header = ['Subject'];
                    test = buildHeaderTest(header, values, match);
                    break;

                case 'attachments':
                    header = null;
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
            if (destination !== null) {
                then = buildFileintoThen(destination);
                thens.push(then);
            }
        }

        // Mark: (needs to only be included if flags are not false)
        if (simple.Actions.Mark.Read !== false || simple.Actions.Mark.Starred !== false) {
            then = buildSetflagThen(simple.Actions.Mark.Read, simple.Actions.Mark.Starred);
            thens.push(then);
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
                requires: requires
            },
            version
        );
    }

    function fromTree(tree) {
        tree = validateTree(tree);
        tree = JSON.parse(JSON.stringify(tree));

        var simple = {
            Operator: {},
            Conditions: [],
            Actions: {}
        };


        operator = invert(OPERATOR_KEYS)[tree.If.Type];
        simple.Operator.label = LABEL_KEYS[operator];
        simple.Operator.value = operator;

        conditions = iterateCondition(tree.If.Tests);
        simple.Conditions = simple.Conditions.concat(conditions);

        actions = iterateAction(tree.Then);
        simple.Actions = actions;

        return simple;
    }

    function validateTree(tree) {
        var string = '';

        var mainNode = null;
        var requiredExtensions = ['fileinto', 'imap4flags'];
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
                }
            }

            if (requiredExtensions.length) {
                throw {name: 'InvalidInput', message: 'Invalid tree representation: requirements'};
            }
        }

        if (!mainNode) {
            throw { name: 'InvalidInput', message: 'Invalid tree representation: ' + string + ' level' };
        }

        return mainNode;
    }

    function iterateCondition(array) {
        var conditions = [];

        for (var index in array) {
            var element = array[index];

            var negate = false;
            if (element.Type === 'Not') {
                negate = true;
                element = element.Test;
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

            if (type === 'attachments') {
                comparator = buildSimpleComparator('Contains', negate);
            } else {
                comparator = buildSimpleComparator(element.Match.Type, negate);
            }

            params = {
                Comparator: comparator,
                Values: (element.Keys !== undefined) ? element.Keys : []
            };

            condition = buildSimpleCondition(type, comparator, params);
            conditions.push(condition);
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
    function ToTree (modal, version = V1) {
        tree = null;

        try {
            tree = toTree(modal, version);
        } catch (exception) {
            if (DEBUG) {
                console.error(exception);
            }
            tree = [];
        }

        return tree;
    }

    // Public interface to the fromTree() function
    function FromTree(tree) {
        modal = null;

        try {
            modal = fromTree(tree);
        } catch (exception) {
            if (DEBUG) {
                console.error(exception);
            }
            modal = {};
        }

        return modal;
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
            return self.indexOf(item) == pos;
        });
    }

    // Tree representation helpers
    // ===========================
    // @internal Helper functions for building backend filter representation trees from the frontend modal

    function buildBasicTree (parameters, version) {
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

    function buildSpamtestTest () {
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

    function buildSieveRequire (requires, mandatory = ['fileinto', 'imap4flags'])
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
        addresspart = 'All'; // FIXME Matching to the whole address for now
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
        flags = [];
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

        if (comparator === null || comparator === undefined) {
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

    var expose = {
        fromTree: FromTree,
        toTree: ToTree
    };

    return expose;
}());

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Sieve;
}
