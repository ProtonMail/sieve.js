module.exports = {
    tree: [
        {
            List: ['include', 'environment', 'variables', 'relational', 'comparator-i;ascii-numeric', 'spamtest'],
            Type: 'Require'
        },
        {
            List: ['fileinto', 'imap4flags', 'vacation'],
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
                    Message: '<div>Vacation test<br></div>',
                    Args: {
                        MIMEType: 'text/html'
                    },
                    Type: 'Vacation'
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
            FileInto: [],
            Vacation: '<div>Vacation test<br></div>'
        }
    }
};
