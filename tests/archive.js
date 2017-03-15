/*
* test.js
* Sieve/Tree test inputs
*/

var Test = (function() {

    var tree = [
        {
            "List": [
                "fileinto",
                "imap4flags"
            ],
            "Type": "Require"
        },
        {
            "If": {
                "Tests": [
                    {
                        "Test": {
                            "Headers": [
                                "Subject"
                            ],
                            "Keys": [
                                "Subject1"
                            ],
                            "Match": {
                                "Type": "Contains"
                            },
                            "Format": {
                                "Type": "UnicodeCaseMap"
                            },
                            "Type": "Header"
                        },
                        "Type": "Not"
                    },
                    {
                        "Headers": [
                            "To",
                            "Cc",
                            "Bcc"
                        ],
                        "Keys": [
                            "Recipient1"
                        ],
                        "Match": {
                            "Type": "Is"
                        },
                        "Format": {
                            "Type": "UnicodeCaseMap"
                        },
                        "Type": "Address",
                        "AddressPart": {
                            "Type": "All"
                        }
                    },
                    {
                        "Test": {
                            "Headers": [
                                "To",
                                "Cc",
                                "Bcc"
                            ],
                            "Keys": [
                                "Recipient2"
                            ],
                            "Match": {
                                "Type": "Matches"
                            },
                            "Format": {
                                "Type": "UnicodeCaseMap"
                            },
                            "Type": "Address",
                            "AddressPart": {
                                "Type": "All"
                            }
                        },
                        "Type": "Not"
                    },
                    {
                        "Headers": [
                            "From"
                        ],
                        "Keys": [
                            "Sender1*"
                        ],
                        "Match": {
                            "Type": "Matches"
                        },
                        "Format": {
                            "Type": "UnicodeCaseMap"
                        },
                        "Type": "Address",
                        "AddressPart": {
                            "Type": "All"
                        }
                    },
                    {
                        "Test": {
                            "Headers": [
                                "From"
                            ],
                            "Keys": [
                                "*Sender2"
                            ],
                            "Match": {
                                "Type": "Matches"
                            },
                            "Format": {
                                "Type": "UnicodeCaseMap"
                            },
                            "Type": "Address",
                            "AddressPart": {
                                "Type": "All"
                            }
                        },
                        "Type": "Not"
                    },
                    {
                        "Test": {
                            "Headers": [
                                "X-Attached"
                            ],
                            "Type": "Exists"
                        },
                        "Type": "Not"
                    }
                ],
                "Type": "AllOf"
            },
            "Then": [
                {
                    "Flags": [
                        "\\Seen"
                    ],
                    "Type": "AddFlag"
                },
                {
                    "Name": "panda qwe qwe qwe qweqwe qw e",
                    "Type": "FileInto"
                },
                {
                    "Name": "panda3",
                    "Type": "FileInto"
                },
                {
                    "Name": "cool",
                    "Type": "FileInto"
                },
                {
                    "Name": "panda2",
                    "Type": "FileInto"
                },
                {
                    "Name": "test",
                    "Type": "FileInto"
                },
                {
                    "Name": "very long label wowowowowowowowowowowowoowowowwo",
                    "Type": "FileInto"
                },
                {
                    "Name": "wqeqweqweqweqweqweqweqweqweqweqweqweqweqweqwe",
                    "Type": "FileInto"
                },
                {
                    "Name": "archive",
                    "Type": "FileInto"
                }
            ],
            "Type": "If"
        }
    ];

    var simple = {
        "Operator":
        {
            "label": "All",
            "value": "all"
        },
        "Conditions": [
            {
                "Type":
                {
                    "label": "Subject",
                    "value": "subject"
                },
                "Comparator":
                {
                    "label": "does not contain",
                    "value": "!contains"
                },
                "Values": ["Subject1"]
            },
            {
                "Type":
                {
                    "label": "Recipient",
                    "value": "recipient"
                },
                "Comparator":
                {
                    "label": "is exactly",
                    "value": "is"
                },
                "Values": ["Recipient1"]
            },
            {
                "Type":
                {
                    "label": "Recipient",
                    "value": "recipient"
                },
                "Comparator":
                {
                    "label": "does not match",
                    "value": "!matches"
                },
                "Values": ["Recipient2"]
            },
            {
                "Type":
                {
                    "label": "Sender",
                    "value": "sender"
                },
                "Comparator":
                {
                    "label": "Matches",
                    "value": "starts"
                },
                "Values": ["Sender1"]
            },
            {
                "Type":
                {
                    "label": "Sender",
                    "value": "sender"
                },
                "Comparator":
                {
                    "label": "does not end with",
                    "value": "!ends"
                },
                "Values": ["Sender2"]
            },
            {
                "Type":
                {
                    "label": "Attachments",
                    "value": "attachments"
                },
                "Comparator":
                {
                    "label": "does not contain",
                    "value": "!contains"
                },
                "Values": []
            }
        ],
        "Actions":
        {
            "FileInto": [
                "panda qwe qwe qwe qweqwe qw e",
                "panda3",
                "cool",
                "panda2",
                "test",
                "very long label wowowowowowowowowowowowoowowowwo",
                "wqeqweqweqweqweqweqweqweqweqweqweqweqweqweqwe",
                "archive"
            ],
            "Mark":
            {
                "Read": true,
                "Starred": false
            }
        }
    };

    return {
        tree: tree,
        simple: simple
    };
}());

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Test;
}
