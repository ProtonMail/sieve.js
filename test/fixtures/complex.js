/*
 * Sieve/Tree test inputs
 */

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
                    "Headers": [
                        "From"
                    ],
                    "Keys": [
                        "noreply@damejidlo.cz",
                        "sluzebnicek@alza.cz"
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
                    "Headers": [
                        "subject"
                    ],
                    "Keys": [
                        "*order*"
                    ],
                    "Match": {
                        "Type": "Matches"
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
                "Name": "archive",
                "Type": "FileInto"
            },
            {
                "Flags": [
                    "\\Seen"
                ],
                "Type": "AddFlag"
            },
            {
                "Type": "Keep"
            }
        ],
        "Type": "If",
        "ElseIfs": [
            {
                "If": {
                    "Tests": [
                        {
                            "Headers": [
                                "From"
                            ],
                            "Keys": [
                                "zakaznici@damejidlo.cz"
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
                        }
                    ],
                    "Type": "AllOf"
                },
                "Then": [
                    {
                        "Name": "archive",
                        "Type": "FileInto"
                    },
                    {
                        "Flags": [
                            "\\Seen"
                        ],
                        "Type": "AddFlag"
                    },
                    {
                        "Type": "Keep"
                    }
                ]
            },
            {
                "If": {
                    "Tests": [
                        {
                            "Headers": [
                                "From"
                            ],
                            "Keys": [
                                "do_not_reply@gog.com"
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
                        }
                    ],
                    "Type": "AllOf"
                },
                "Then": [
                    {
                        "Name": "archive",
                        "Type": "FileInto"
                    },
                    {
                        "Flags": [
                            "\\Seen"
                        ],
                        "Type": "AddFlag"
                    },
                    {
                        "Type": "Keep"
                    }
                ]
            },
            {
                "If": {
                    "Tests": [
                        {
                            "Headers": [
                                "From"
                            ],
                            "Keys": [
                                "do_not_reply@gog.com"
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
                        }
                    ],
                    "Type": "AllOf"
                },
                "Then": [
                    {
                        "Name": "archive",
                        "Type": "FileInto"
                    },
                    {
                        "Flags": [
                            "\\Seen"
                        ],
                        "Type": "AddFlag"
                    },
                    {
                        "Type": "Keep"
                    }
                ]
            },
            {
                "If": {
                    "Tests": [
                        {
                            "Headers": [
                                "From"
                            ],
                            "Keys": [
                                "no-reply@coinbase.com"
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
                        }
                    ],
                    "Type": "AllOf"
                },
                "Then": [
                    {
                        "Name": "archive",
                        "Type": "FileInto"
                    },
                    {
                        "Flags": [
                            "\\Seen"
                        ],
                        "Type": "AddFlag"
                    },
                    {
                        "Type": "Keep"
                    }
                ]
            }
        ],
        "Else": [
            {
                "Type": "Keep"
            }
        ]
    }
];

var simple = {};

module.exports = {
    tree,
    simple
};
