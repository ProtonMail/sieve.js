const tree = [
    {
        List: ['include', 'environment', 'variables', 'relational', 'comparator-i;ascii-numeric'],
        Type: 'Require'
    },
    {
        List: ['fileinto', 'imap4flags', 'vacation'],
        Type: 'Require'
    },
    {
        Name: 'dollar',
        Value: '$',
        Flags: [],
        Type: 'Set'
    },
    {
        Text: '/**\r\n * @type or\r\n * @comparator ends\r\n */',
        Type: 'Comment'
    },
    {
        If: {
            Tests: [
                {
                    Headers: ['To', 'Cc', 'Bcc'],
                    Keys: [
                        {
                            Type: 'VariableString',
                            Value: '*${dollar}{frommail}'
                        },
                        '*${}',
                        {
                            Type: 'VariableString',
                            Value: '*${dollar}{frommail} ${dollar}{tomail}'
                        }
                    ],
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
                }
            ],
            Type: 'AnyOf'
        },
        Then: [
            {
                Name: 'archive',
                Type: 'FileInto'
            },
            {
                Name: 'polo',
                Type: 'FileInto'
            },
            {
                Name: {
                    Value: '${dollar}{File}',
                    Type: 'VariableString'
                },
                Type: 'FileInto'
            },
            {
                Flags: ['\\Seen', '\\Flagged'],
                Type: 'AddFlag'
            },
            {
                Type: 'Keep'
            },
            {
                Message: {
                    Value: "<div>Je mange une pomme, ${dollar}{d3_so} pas ${déso} mais ${j'ai} faim pedro</div> ",
                    Type: 'VariableString'
                },
                Args: {
                    MIMEType: 'text/html'
                },
                Type: 'Vacation'
            }
        ],
        Type: 'If'
    }
];

const simple = {
    Operator: {
        label: 'Any',
        value: 'any'
    },
    Conditions: [
        {
            Type: {
                value: 'recipient',
                label: 'Recipient'
            },
            Comparator: {
                value: 'ends',
                label: 'ends with'
            },
            Values: ['${frommail}', '${}', '${frommail} ${tomail}']
        }
    ],
    Actions: {
        FileInto: ['archive', 'polo', '${File}'],
        Mark: {
            Read: true,
            Starred: true
        },
        Vacation: "<div>Je mange une pomme, ${d3_so} pas ${déso} mais ${j'ai} faim pedro</div> "
    }
};

module.exports = { tree, simple };
