const tree = [
    {
        List: ['include', 'environment', 'variables', 'relational', 'comparator-i;ascii-numeric'],
        Type: 'Require'
    },
    {
        List: ['fileinto', 'imap4flags'],
        Type: 'Require'
    },
    {
        Text: '/**\r\n * @type and\r\n * @comparator starts\r\n * @comparator !ends\r\n */',
        Type: 'Comment'
    },
    {
        If: {
            Tests: [
                {
                    Headers: ['Subject'],
                    Keys: ['starts with*'],
                    Match: {
                        Type: 'Matches'
                    },
                    Format: {
                        Type: 'UnicodeCaseMap'
                    },
                    Type: 'Header'
                },
                {
                    Test: {
                        Headers: ['Subject'],
                        Keys: ['*ends with'],
                        Match: {
                            Type: 'Matches'
                        },
                        Format: {
                            Type: 'UnicodeCaseMap'
                        },
                        Type: 'Header'
                    },
                    Type: 'Not'
                }
            ],
            Type: 'AllOf'
        },
        Then: [
            {
                Type: 'FileInto',
                Name: 'important'
            },
            {
                Type: 'FileInto',
                Name: 'Folder'
            },
            {
                Type: 'AddFlag',
                Flags: ['\\Seen']
            },
            {
                Type: 'Keep'
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
            Values: ['starts with'],
            Type: {
                label: 'Subject',
                value: 'subject'
            },
            Comparator: {
                label: 'begins with',
                value: 'starts'
            }
        },
        {
            Values: ['ends with'],
            Type: {
                label: 'Subject',
                value: 'subject'
            },
            Comparator: {
                label: 'does not end with',
                value: '!ends'
            }
        }
    ],
    Actions: {
        FileInto: ['important', 'Folder'],
        Mark: {
            Read: true,
            Starred: false
        }
    }
};

module.exports = {
    tree,
    simple
};
