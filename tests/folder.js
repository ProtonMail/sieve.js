/*
 * folder.js
 * Sieve/Tree test inputs
 */

var Test = (function() {

    var tree =  [
        {
            "List": [
                "fileinto",
                "imap4flags"
            ],
            "Type": "Require"
        },
        {
            "If":
            {
                "Tests": [
                    {
                        "Headers": [
                            "Subject"
                        ],
                        "Keys": [
                            "Order",
                        ],
                        "Match": {
                            "Type": "Contains"
                        },
                        "Format": {
                            "Type": "UnicodeCaseMap"
                        },
                        "Type": "Header"
                    }
            ],
            "Type": "AllOf"
            },
            "Then": [
                {
                    "Type": "FileInto",
                    "Name": "important"
                },
                {
                    "Type": "FileInto",
                    "Name": "Folder"
                },
                {
                    "Type": "AddFlag",
                    "Flags": ["\\Seen"]
                },
                {
                    "Type": "Keep"
                }
            ],
            "Type": "If"
        }
    ];

    var simple = {
         "Operator": {
            "label": "All",
            "value": "all"
         },
         "Conditions": [
             {
                 "Values": [
                     "Order",
                 ],
                 "Type":
                 {
                     "label": "Subject",
                     "value": "subject"
                 },
                 "Comparator":
                 {
                     "label": "contains",
                     "value": "contains"
                 }
            }
        ],
        "Actions": {
            "FileInto": [
                "important",
                "Folder"
            ],
            "Mark": {
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
