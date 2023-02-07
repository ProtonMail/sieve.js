module.exports = {
    tree: [
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
                        Headers: ['From'],
                        Keys: ['From'],
                        Match: {
                            Type: 'Contains'
                        },
                        Format: {
                            Type: 'UnicodeCaseMap'
                        },
                        AddressPart: {
                            Type: 'All'
                        },
                        Type: 'Address'
                    }
                ],
                Type: 'AllOf'
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
    ],
    simple: {
        Operator: {
            label: 'All',
            value: 'all'
        },
        Conditions: [
            {
                Values: ['From'],
                Type: {
                    label: 'Sender',
                    value: 'sender'
                },
                Comparator: {
                    label: 'contains',
                    value: 'contains'
                }
            }
        ],
        Actions: {
            Mark: {
                Read: true,
                Starred: false
            },
            FileInto: []
        }
    }
};
