const tree = [
    {
        List: ['fileinto', 'imap4flags'],
        Type: 'Require'
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
            Values: ['starts with*'],
            Type: {
                label: 'Subject',
                value: 'subject'
            },
            Comparator: {
                label: 'matches',
                value: 'matches'
            }
        },
        {
            Values: ['*ends with'],
            Type: {
                label: 'Subject',
                value: 'subject'
            },
            Comparator: {
                label: 'does not match',
                value: '!matches'
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
