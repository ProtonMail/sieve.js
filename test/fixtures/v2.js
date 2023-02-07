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
        Text: '/**\r\n * @type and\r\n * @comparator contains\r\n */',
        Type: 'Comment'
    },
    {
        If: {
            Tests: [
                {
                    Headers: ['Subject'],
                    Keys: ['Order'],
                    Match: {
                        Type: 'Contains'
                    },
                    Format: {
                        Type: 'UnicodeCaseMap'
                    },
                    Type: 'Header'
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
            Values: ['Order'],
            Type: {
                label: 'Subject',
                value: 'subject'
            },
            Comparator: {
                label: 'contains',
                value: 'contains'
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
