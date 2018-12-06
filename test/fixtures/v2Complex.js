module.exports = {
    simple: {
        Operator: {
            label: 'Any',
            value: 'any'
        },
        Conditions: [
            {
                Type: {
                    value: 'subject',
                    label: 'Subject'
                },
                Comparator: {
                    value: 'starts',
                    label: 'begins with'
                },
                Values: ['subject']
            },
            {
                Type: {
                    value: 'sender',
                    label: 'Sender'
                },
                Comparator: {
                    value: 'starts',
                    label: 'begins with'
                },
                Values: ['*?\\sender\\?*']
            },
            {
                Type: {
                    value: 'recipient',
                    label: 'Recipient'
                },
                Comparator: {
                    value: 'ends',
                    label: 'ends with'
                },
                Values: ['*?\\recipient\\?*']
            },
            {
                Type: {
                    value: 'attachments',
                    label: 'Attachments'
                },
                Comparator: {
                    value: 'contains',
                    label: 'contains'
                },
                Values: []
            }
        ],
        Actions: {
            FileInto: [],
            Mark: {
                Read: true,
                Starred: false
            }
        }
    },
    tree: [
        {
            List: ['include', 'environment', 'variables', 'relational', 'comparator-i;ascii-numeric', 'spamtest'],
            Type: 'Require'
        },
        {
            List: ['fileinto', 'imap4flags'],
            Type: 'Require'
        },
        {
            Text: '# Generated: Do not run this script on spam messages',
            Type: 'Comment'
        },
        {
            If: {
                Tests: [
                    {
                        Name: 'vnd.proton.spam-threshold',
                        Keys: ['*'],
                        Format: null,
                        Match: {
                            Type: 'Matches'
                        },
                        Type: 'Environment'
                    },
                    {
                        Value: {
                            Value: '${1}',
                            Type: 'VariableString'
                        },
                        Flags: [],
                        Format: {
                            Type: 'ASCIINumeric'
                        },
                        Match: {
                            Comparator: 'ge',
                            Type: 'GreaterEqualsValue'
                        },
                        Type: 'SpamTest'
                    }
                ],
                Type: 'AllOf'
            },
            Then: [
                {
                    Type: 'Return'
                }
            ],
            Type: 'If'
        },
        {
            Text:
                '/**\r\n * @type or\r\n * @comparator starts\r\n * @comparator starts\r\n * @comparator ends\r\n * @comparator default\r\n */',
            Type: 'Comment'
        },
        {
            If: {
                Tests: [
                    {
                        Headers: ['Subject'],
                        Keys: ['subject*'],
                        Match: {
                            Type: 'Matches'
                        },
                        Format: {
                            Type: 'UnicodeCaseMap'
                        },
                        Type: 'Header'
                    },
                    {
                        Headers: ['From'],
                        Keys: ['\\\\*\\\\?\\\\sender\\\\\\\\?\\\\**'],
                        Match: {
                            Type: 'Matches'
                        },
                        Format: {
                            Type: 'UnicodeCaseMap'
                        },
                        AddressPart: {
                            Type: 'All'
                        },
                        Type: 'Address'
                    },
                    {
                        Headers: ['To', 'Cc', 'Bcc'],
                        Keys: ['*\\\\*\\\\?\\\\recipient\\\\\\\\?\\\\*'],
                        Match: {
                            Type: 'Matches'
                        },
                        Format: {
                            Type: 'UnicodeCaseMap'
                        },
                        AddressPart: {
                            Type: 'All'
                        },
                        Type: 'Address'
                    },
                    {
                        Headers: ['X-Attached'],
                        Type: 'Exists'
                    }
                ],
                Type: 'AnyOf'
            },
            Then: [
                {
                    Flags: ['\\Seen'],
                    Type: 'AddFlag'
                },
                {
                    Type: 'Keep'
                }
            ],
            Type: 'If'
        }
    ]
};
