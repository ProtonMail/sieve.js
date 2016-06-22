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
                    "Type": "SetFlag"
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

    tree = [
        {
            "List": ["fileinto", "imap4flags"],
            "Type": "Require"
        },
        {
            "If":
            {
                "Tests": [
                {
                    "Headers": ["Subject"],
                    "Keys": ["bart"],
                    "Match":
                    {
                        "Type": "Contains"
                    },
                    "Format":
                    {
                        "Type": "UnicodeCaseMap"
                    },
                    "Type": "Header"
                }],
                "Type": "AllOf"
            },
            "Then": [
            {
                "Name": "archive",
                "Type": "FileInto"
            }],
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
                "Values": ["Subject1"],
                "value": ""
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
                "Values": ["Recipient1"],
                "value": ""
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
                "Values": ["Recipient2"],
                "value": ""
            },
            {
                "Type":
                {
                    "label": "Sender",
                    "value": "sender"
                },
                "Comparator":
                {
                    "label": "begins with",
                    "value": "starts"
                },
                "Values": ["Sender1"],
                "value": ""
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
                "Values": ["Sender2"],
                "value": ""
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
                "Values": [],
                "value": ""
            }
        ],
        "Actions":
        {
            "Labels":
            [
                {
                    "ID": "aRIrfHmjM1TQS0h6HnXPS2n4qgKvblYkg7bpnrVyPRrju8J2iTad7WCRebBfEHUIpc-Eg-2GI3MAEIb7HaIRLw==",
                    "Name": "panda qwe qwe qwe qweqwe qw e",
                    "Color": "#dfb286",
                    "Display": 1,
                    "Order": 1,
                    "Selected": true
                },
                {
                    "ID": "Bhw97Uvgv9zyIGUTuUsgixZOPJvEAEXgBGpj24eMYDUt0XcnMCLgMS0EvZMN0RDBazskIxXkmJ6C7OuFn0GyHw==",
                    "Name": "panda3",
                    "Color": "#72bb75",
                    "Display": 1,
                    "Order": 2,
                    "Selected": true
                },
                {
                    "ID": "X9etetGSJUTRbnwjEgIygeXO6C7By2j7ZjZ34-o8_Th6Z98pbUGR5hv55KhBpQFNH4HMzrMDbqbu6DfObBbSHg==",
                    "Name": "cool",
                    "Color": "#7272a7",
                    "Display": 1,
                    "Order": 3,
                    "Selected": false
                },
                {
                    "ID": "H6xRqFdCSsQmDqggCPP-7x8wDzdMpLMmnTqLZn-xGhEzXv6C1T5cCyrmJaz7Q-yOCQLPHicytu6Sco6-RYtkwg==",
                    "Name": "panda2",
                    "Color": "#7569d1",
                    "Display": 1,
                    "Order": 4,
                    "Selected": false
                },
                {
                    "ID": "AYwKS8nFfSZHBojryDfSr1X0bo1Ej5zsZMLD8weUoulZ_ecbN5RSohpl-_aUEM5Ui7lRGiHkfwXZW1aaZ0MkwA==",
                    "Name": "test",
                    "Color": "#e6984c",
                    "Display": 1,
                    "Order": 5,
                    "Selected": false
                },
                {
                    "ID": "xLDT_Mx0M4Th3aS9ECJ-IVR-TuaVHoZOyiFC7i0ObTtKLnfxLJRLNmbPhFKDP-FxsRE-p1vM-xCeELv2nDnqwQ==",
                    "Name": "very long label wowowowowowowowowowowowoowowowwo",
                    "Color": "#7272a7",
                    "Display": 1,
                    "Order": 6,
                    "Selected": false
                },
                {
                    "ID": "GlK2sRLkqoJ54L0jr4eNE9tWa3R7usvuJLr-mafhJn45R3GjapuQahCpdr4rUlN0aRMRMgvPSObVkPv5RpkODg==",
                    "Name": "wqeqweqweqweqweqweqweqweqweqweqweqweqweqweqwe",
                    "Color": "#72bb75",
                    "Display": 1,
                    "Order": 7,
                    "Selected": false
                }
            ],
            "Move": "6",
            "Mark":
            {
                "Read": true,
                "Starred": false
            }
        }
    };

    simple = {
        "Operator":
        {
            "label": "all",
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
                "label": "contains",
                "value": "contains"
            },
            "Values": ["eeeee"],
            "value": ""
        }],
        "Actions":
        {
            "Labels": [],
            "Move": null,
            "Mark":
            {
                "Read": false,
                "Starred": false
            }
        }
    };


    var old = {
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

    return {
        tree: tree,
        simple: simple
    };
}());

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Test;
}
