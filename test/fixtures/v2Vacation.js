module.exports = {
    tree: [
        {
            List: ['include', 'environment', 'variables', 'relational', 'comparator-i;ascii-numeric'],
            Type: 'Require'
        },
        {
            List: ['fileinto', 'imap4flags', 'vacation'],
            Type: 'Require'
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
