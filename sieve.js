/*
 * libsieve.js
 * Sieve/Tree representation builder
 */

 var Sieve = (function() {

    var DEBUG = true;

    var MAILBOX_IDENTIFIERS = {
        "inbox"  : '0',
        "drafts" : '1',
        "sent"   : '2',
        "trash"  : '3',
        "spam"   : '4',
        "archive": '6',
        "search" : '7',
        "label"  : '8',
        "starred": '10'
    };

    var MATCH_KEYS = {
        "is"      : "Is",
        "contains": "Contains",
        "matches" : "Matches"
    };

    var OPERATOR_KEYS = {
        "all": "AllOf",
        "any" : "AnyOf"
    };

    function escapeCharacters(text) {
        return text.replace(/([*?])/g, "\\\\$1");
    }

    function validateModal(modal)
    {
        var pass = true;

        pass = pass && modal.hasOwnProperty('Operator');
        pass = pass && modal.hasOwnProperty('Conditions');
        pass = pass && modal.hasOwnProperty('Actions');

        if (!pass) {
            throw { name: 'InvalidInput', message: 'Invalid modal keys' };
        }

        // pass = pass && modal.Operator instanceof String;
        pass = pass && modal.Conditions instanceof Array;
        pass = pass && modal.Actions instanceof Array;

        if (!pass) {
            throw { name: 'InvalidInput', message: 'Invalid modal data types' };
        }

        for (var index in modal.Conditions) {
            var condition = modal.Conditions[index];

            pass = pass && condition.hasOwnProperty('Not');
            pass = pass && condition.hasOwnProperty('Type');

            if (pass) {
                if (condition.Type !== "attachments") {
                    pass = pass && condition.hasOwnProperty('Comparator');
                    pass = pass && condition.hasOwnProperty('Values');
                }
            }
        }

        for (index in modal.Actions) {
            var action = modal.Actions[index];
            pass = pass && action.hasOwnProperty('Type');

            if (pass) {
                switch (action.Type) {
                    case "labels":
                        pass = pass && action.hasOwnProperty('Labels');
                        break;

                    case "move":
                        pass = pass && action.hasOwnProperty('Folder');
                        break;

                    case "mark":
                        pass = pass && action.hasOwnProperty('Read');
                        pass = pass && action.hasOwnProperty('Starred');
                        break;
                }
            }
        }

        if (!pass) {
            throw { name: 'InvalidInput', message: 'Invalid modal data' };
        }

        return modal;
    }

    // Public interface to the toTree() function
    function ToTree(modal)
    {
        tree = null;

        try {
            tree = toTree(modal);
        } catch (e) {
            tree = [];
        }

        return tree;
    }

    function toTree(modal)
    {
        modal = validateModal(modal);

        var type = OPERATOR_KEYS[modal.Operator];
        var tests = [];
        var thens = [];

        for (var index in modal.Conditions) {
            condition = modal.Conditions[index];
            var test;

            if (condition.Type === "attachments") {
                test = buildAttachmentTest();
            }
            else
            {
                var header;

                for (var v in condition.Values) {
                    var value = condition.Values[v];
                    // Escape on Simple rep. "matches", "begins" and "ends" which maps to Tree "Matches"
                    switch (condition.Comparator) {
                        case "starts":
                            condition.Comparator = "matches";
                            value = escapeCharacters(value);
                            condition.Values[v] = "".concat(value, "*");
                            break;
                        case "ends":
                            condition.Comparator = "matches";
                            value = escapeCharacters(value);
                            condition.Values[v] = "".concat("*", value);
                            break;
                    }
                }

                var match = MATCH_KEYS[condition.Comparator];
                var values = unique(condition.Values);

                switch(condition.Type) {
                    case "sender":
                        header = ["From"];
                        test = buildAddressTest(header, values, match);
                        break;

                    case "recipient":
                        header = ["To", "Cc", "Bcc"];
                        test = buildAddressTest(header, values, match);
                        break;

                    case "subject":
                        header = ["Subject"];
                        test = buildHeaderTest(header, values, match);
                        break;
                }
            }

            if (condition.Not) test = buildTestNegate(test);
            tests.push(test);
        }

        for (index in modal.Actions) {
            action = modal.Actions[index];

            var then;
            switch (action.Type) {
                case "labels":
                    for (index in action.Labels) {
                        label = action.Labels[index];
                        then = buildFileintoThen(label);
                        thens.push(then);
                    }
                    break;

                case "move":
                    var destination = invert(MAILBOX_IDENTIFIERS)[action.Folder];
                    then = buildFileintoThen(destination);
                    thens.push(then);
                    break;

                case "mark":
                    then = buildSetflagThen(action.Read, action.Starred);
                    thens.unshift(then); // SetFlags need to always be first
                    break;
            }
        }

        return buildBasicTree(type, tests, thens);
    }

    // Public interface to the fromTree() function
    function FromTree(tree)
    {
        modal = null;

        try {
            modal = fromTree(tree);
        } catch (e) {
            modal = {};
        }

        return modal;
    }

    function fromTree(tree)
    {
        var modal = {
            "Operator": "all",
            "Conditions": [],
            "Actions": []
        };

        tree = validateTree(tree);

        conditions = iterateCondition(tree.If.Tests);
        modal.Conditions = modal.Conditions.concat(conditions);

        actions = iterateAction(tree.Then);
        modal.Actions = modal.Actions.concat(actions);

        return modal;
    }

    function validateTree(tree) {
        if (tree instanceof Array) {
            var check = tree[0]; // First elements corresponds to the requirements
            if (check.Type === "require") {
                requirements = ["fileinto", "imap4flags"];
                if (check.List.indexOf(requirements) < 0) {
                    throw { name: 'InvalidInput', message: 'Invalid tree representation' };
                }
            }

            // Second element is used to build the modal
            tree = tree[1];
        }

        var pass = true;

        pass = pass && tree.hasOwnProperty('If');
        pass = pass && tree.If.hasOwnProperty('Tests');
        pass = pass && tree.hasOwnProperty('Then');
        pass = pass && tree.hasOwnProperty('Type');

        if (!pass) {
            throw { name: 'InvalidInput', message: 'Invalid tree representation' };
        }

        return tree;
    }

    function iterateCondition(array)
    {
        var conditions = [];

        for (var index in array) {
            var element = array[index];

            var negate = false;
            if (element.Type === "Not") {
                negate = true;
                element = element.Test;
            }

            var type = null;
            var params = null;

            switch (element.Type) {
                case "Exists":
                    if (element.Headers.indexOf("X-Attached") >= 0) {
                        type = "attachments";
                    }
                    break;

                case "Header":
                    if (element.Headers.indexOf("Subject") >= 0) {
                        type = "subject";
                    }
                    break;

                case "Address":
                    if (element.Headers.indexOf("From") >= 0) {
                        type = "sender";
                    }
                    else if (element.Headers.indexOf("To") >= 0) {
                        type = "recipient";
                    }
                    else if (element.Headers.indexOf("Cc")  >= 0) {
                        type = "recipient";
                    }
                    else if (element.Headers.indexOf("Bcc") >= 0) {
                        type = "recipient";
                    }
                    break;
            }

            if (type !== "attachments") {
                var comparator = invert(MATCH_KEYS)[element.Match.Type];
                params = {
                    "Comparator": comparator,
                    "Values": element.Keys
                };
            }

            condition = buildSimpleCondition(type, negate, params);
            conditions.push(condition);
        }

        return conditions;
    }

    function iterateAction(array)
    {
        var actions = [];
        var labels = [];
        var labelindex = null;

        for (var index in array) {
            var skip = false;
            var element = array[index];

            var type = null;
            var params = null;

            switch (element.Type) {
                case "Reject":
                    throw { name: 'UnsupportedRepresentation', message: 'Unsupported filter representation' };

                case "Redirect":
                    throw { name: 'UnsupportedRepresentation', message: 'Unsupported filter representation' };

                case "Keep":
                    type = "move";
                    params = {
                        "Folder": MAILBOX_IDENTIFIERS.inbox
                    };
                    break;

                case "Discard":
                    type = "move";
                    params = {
                        "Folder": MAILBOX_IDENTIFIERS.trash
                    };
                    break;

                case "FileInto":
                    var name = element.Name;

                    switch (name) {
                        case "inbox":
                        case "drafts":
                        case "sent":
                        case "starred":
                        case "archive":
                        case "spam":
                        case "trash":
                            type = "move";
                            name = MAILBOX_IDENTIFIERS[name];
                            params = {
                                "Folder": name
                            };
                            break;

                        default:
                            labels.push(name);
                            if (labelindex === null) labelindex = index; // preserve the index of the first label action
                            skip = true;
                            break;
                    }

                    break;

                case "SetFlag":
                    type = "mark";

                    var read = (element.Flags.indexOf("\\Seen") >= 0);
                    var starred = (element.Flags.indexOf("\\Flagged") >= 0);

                    params = {
                        "Read": read,
                        "Starred": starred
                    };
                    break;

                default:
                    throw { name: 'UnsupportedRepresentation', message: 'Unsupported filter representation' };
            }

            if (skip) continue;

            action = buildSimpleAction(type, params);
            actions.push(action);
        }

        // Append labels action
        // FIXME This implies that order of actions is not preserved
        action = buildSimpleAction("labels", {
            "Labels": labels
        });
        actions.splice(labelindex, 0, action);

        return actions;
    }

    // Generic helper functions
    // ========================

    function invert(object)
    {
        var inverted = {};

        for (var property in object) {
            if(object.hasOwnProperty(property)) {
                inverted[object[property]] = property;
            }
        }

        return inverted;
    }

    function unique(array)
    {
        return array.filter(function(item, pos, self) {
            return self.indexOf(item) == pos;
        });
    }

    // Tree helpers
    // ============
    // @internal Helper functions for building backend filter representation trees from the frontend modal

    function buildBasicTree(type, tests, actions) {
        require = buildSieveRequire();
        return [
            require,
            {
                "If":
                {
                    "Tests": tests,
                    "Type": type
                },
                "Then": actions,
                "Type": "If"
            }
        ];
    }

    function buildTestNegate(test) {
        return {
            "Test": test,
            "Type": "Not"
        };
    }

    function buildSieveRequire()
    {
        return {
            "List": ["fileinto", "imap4flags"],
            "Type": "Require"
        };
    }

    function buildHeaderTest(headers, keys, match) {
        return {
            "Headers": headers,
            "Keys": keys,
            "Match":
            {
                "Type": match
            },
            "Format":
            {
                "Type": "UnicodeCaseMap"
            },
            "Type": "Header"
        };
    }

    function buildAddressTest(headers, keys, match) {
        addresspart = "All"; // FIXME Matching to the whole address for now
        return {
            "Headers": headers,
            "Keys": keys,
            "Match":
            {
                "Type": match
            },
            "Format":
            {
                "Type": "UnicodeCaseMap"
            },
            "Type": "Address",
            "AddressPart":
            {
                "Type": addresspart
            }
        };
    }

    function buildAttachmentTest() {
        return {
            "Headers":["X-Attached"],
            "Type":"Exists"
        };
    }

    function buildSetflagThen(read, starred) {
        flags = [];
        if (read) {
            flags.push("\\Seen");
        }
        if (starred) {
            flags.push("\\Flagged");
        }
        return {
            "Flags": flags,
            "Type": "SetFlag"
        };
    }

    function buildFileintoThen(label) {
        return {
            "Name": label,
            "Type": "FileInto"
        };
    }

    // Modal helpers
    // =============
    // @internal Helper functions for building frontend filter modal from the backend representation

    function buildSimpleCondition(type, negate, params)
    {
        var condition = {
            "Type": type,
            "Not": negate
        };
        return angular.merge(condition, params);
    }

    function buildSimpleAction(type, params)
    {
        var action = {
            "Type": type
        };
        return angular.merge(action, params);
    }

    var expose = {
        fromTree: FromTree,
        toTree: ToTree
    };

    // Debugging helpers
    // =================
    if (DEBUG)
    {
        var tree = [
            {
                "List": ["fileinto", "imap4flags"],
                "Type": "Require"
            },
            {
                "If":
                {
                    "Tests":
                    [
                        {
                            "Headers": ["From"],
                            "Keys": ["sender@example.com"],
                            "Match":
                            {
                                "Type": "Is"
                            },
                            "Format":
                            {
                                "Type": "UnicodeCaseMap"
                            },
                            "Type": "Address",
                            "AddressPart":
                            {
                                "Type": "All"
                            }
                        },
                        {
                            "Headers": ["To", "Cc", "Bcc"],
                            "Keys": ["target@example.com"],
                            "Match":
                            {
                                "Type": "Contains"
                            },
                            "Format":
                            {
                                "Type": "UnicodeCaseMap"
                            },
                            "Type": "Address",
                            "AddressPart":
                            {
                                "Type": "All"
                            }
                        },
                        {
                            "Headers": ["Subject"],
                            "Keys": ["T*st"],
                            "Match":
                            {
                                "Type": "Matches"
                            },
                            "Format":
                            {
                                "Type": "UnicodeCaseMap"
                            },
                            "Type": "Header"
                        },
                        {
                            "Headers": ["Subject"],
                            "Keys": ["T\\*st*"],
                            "Match":
                            {
                                "Type": "Matches"
                            },
                            "Format":
                            {
                                "Type": "UnicodeCaseMap"
                            },
                            "Type": "Header"
                        },
                        {
                            "Headers": ["Subject"],
                            "Keys": ["*you\\?"],
                            "Match":
                            {
                                "Type": "Matches"
                            },
                            "Format":
                            {
                                "Type": "UnicodeCaseMap"
                            },
                            "Type": "Header"
                        },
                        {
                            "Headers": ["X-Attached"],
                            "Type": "Exists"
                        }
                    ],
                    "Type": "AnyOf"
                },
                "Then":
                [
                    {
                        "Name": "work",
                        "Type": "FileInto"
                    },
                    {
                        "Name": "todo",
                        "Type": "FileInto"
                    },
                    {
                        "Name": "archive",
                        "Type": "FileInto"
                    },
                    {
                        "Flags": ["\\Seen", "\\Flagged"],
                        "Type": "SetFlag"
                    }
                ],
                "Type": "If"
            }
        ];

        var simple = {
            "Operator": "and",
            "Conditions":
            [
                {
                   "Type": "subject",
                   "Comparator": "is",
                   "Values":["T*st"],
                   "Not": false
                },
                {
                   "Type": "sender",
                   "Comparator": "contains",
                   "Values":["sender@example.com"],
                   "Not": false
                },
                {
                   "Type": "recipient",
                   "Comparator": "matches",
                   "Values": ["target@example.com"],
                   "Not": false
                },
                {
                   "Type": "subject",
                   "Comparator": "starts",
                   "Values": ["T*st"],
                   "Not": false
                },
                {
                   "Type": "subject",
                   "Comparator": "ends",
                   "Values": ["you?"],
                   "Not": false
                },
                {
                   "Type": "attachments",
                   "Not": true
                }
            ],
            "Actions":
            [
                {
                    "Type": "mark",
                    "Read": true,
                    "Starred": true
                },
                {
                    "Type": "labels",
                    "Labels":
                    [
                        "work",
                        "todo"
                    ]
                },
                {
                    "Type": "move",
                    "Folder": "6"
                }
            ]
        };

        expose = {
            fromTree: FromTree,
            toTree: ToTree,
            tree: tree,
            simple: simple,
            testTo: toTree,
            testFrom: fromTree
        };
    }

    return expose;
}());

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Sieve;
}
