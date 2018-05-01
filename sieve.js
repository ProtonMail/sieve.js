/*
 * sieve.js
 * Sieve/Tree representation builder
 */

 var Sieve = (function() {

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

        pass = pass && simple.Actions.hasOwnProperty('Autoresponder');

        if (!pass) {
            throw { name: 'InvalidInput', message: 'Invalid simple actions' };
        }

        return simple;
    }

    // Convert to Tree repreentation
    function toTree(simple) {
        simple = validateSimpleRepresentation(simple);
        simple = JSON.parse(JSON.stringify(simple));

        var type = OPERATOR_KEYS[simple.Operator.value];
        var tests = [];
        var thens = [];
        var require = [];
        var vacation = {};

        for (var index in simple.Conditions)
        {
            condition = simple.Conditions[index];
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
            require.push('vacation');
            vacation = buildVacation(simple.Actions.Vacation);
        }

        return buildBasicTree({ type, tests, thens, require, vacation });
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
        var pass = false;

        if (tree instanceof Array) {
            var check = tree[0]; // First elements corresponds to the requirements
            if (check.Type === 'require') {
                requirements = ['fileinto', 'imap4flags'];
                if (check.List.indexOf(requirements) < 0) {
                    throw { name: 'InvalidInput', message: 'Invalid tree representation: requirements' };
                }
            }

            // Second element is used to build the modal
            tree = tree[1];
            pass = true;

            if (pass) {
                pass = pass && tree.hasOwnProperty('If');
                string = 'If';
            }
            // FIXME Figure out whether this is necessary
            if (pass) {
                pass = pass && tree.If.hasOwnProperty('Tests');
                string = 'Tests';
            }
            if (pass) {
                pass = pass && tree.hasOwnProperty('Then');
                string = 'Then';
            }
            if (pass) {
                pass = pass && tree.hasOwnProperty('Type');
                string = 'Type';
            }
        }

        if (!pass) {
            throw { name: 'InvalidInput', message: 'Invalid tree representation: ' + string + ' level' };
        }

        return tree;
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

                case 'Vacation':
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
    function ToTree(modal) {
        tree = null;

        try {
            tree = toTree(modal);
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

    function buildBasicTree(parameters) {
        var treeStructure = [
            require: buildSieveRequire(parameters.requires),
            {
                If:
                {
                    Tests: parameters.tests,
                    Type: parameters.type
                },
                Then: parameters.actions,
                Type: 'If'
            }
        ];

        if (parameters.vacation) {
            treeStructure.push(parameters.vacation);
        }

        return treeStructure;
    }

    function buildTestNegate(test) {
        return {
            Test: test,
            Type: 'Not'
        };
    }

    function buildSieveRequire(requires)
    {
        return {
            List: ['fileinto', 'imap4flags'].concat(requires),
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
            Args: { Mime: 'text/html' },
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
