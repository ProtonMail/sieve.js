const tree = [
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
        Text: '/**\r\n * @type and\r\n * @comparator default\r\n */',
        Type: 'Comment'
    },
    {
        If: {
            Tests: [
                {
                    Headers: ['X-Attached'],
                    Type: 'Exists'
                }
            ],
            Type: 'AllOf'
        },
        Then: [
            {
                Type: 'FileInto',
                Name: 'inbox'
            }
        ],
        Type: 'If'
    }
];

const simple = {
    Operator: {
        label: 'All',
        value: 'all'
    },
    Conditions: [
        {
            Values: [],
            Type: {
                label: 'Attachments',
                value: 'attachments'
            },
            Comparator: {
                label: 'contains',
                value: 'contains'
            }
        }
    ],
    Actions: {
        Mark: {
            Read: false,
            Starred: false
        },
        FileInto: ['inbox']
    }
};

module.exports = {
    tree,
    simple
};
