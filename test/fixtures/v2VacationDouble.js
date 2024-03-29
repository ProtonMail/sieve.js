const simple = {};

const tree = [
    {
        List: ['include', 'environment', 'variables', 'comparator-i;ascii-numeric'],
        Type: 'Require'
    },
    {
        List: ['fileinto', 'imap4flags', 'date', 'vacation'],
        Type: 'Require'
    },
    {
        List: ['relational'],
        Type: 'Require'
    },
    {
        If: {
            Tests: [
                {
                    DateFormat: 'date',
                    Keys: ['2018-06-14'],
                    Zone: {
                        Argument: 'CET',
                        Type: 'Zone'
                    },
                    Format: null,
                    MatchOperator: {
                        Comparator: 'gt',
                        Type: 'GreaterValue'
                    },
                    Type: 'CurrentDate'
                },
                {
                    Headers: ['To', 'Cc', 'Bcc'],
                    Keys: ['shabanarija@protonmail.ch'],
                    Match: {
                        Type: 'Is'
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
                Message: 'SHABAN Autoresponder message text goes here',
                Args: [],
                Type: 'Vacation'
            }
        ],
        Type: 'If'
    },
    {
        If: {
            Tests: [
                {
                    DateFormat: 'date',
                    Keys: ['2018-06-14'],
                    Zone: {
                        Argument: 'CET',
                        Type: 'Zone'
                    },
                    Format: null,
                    MatchOperator: {
                        Comparator: 'gt',
                        Type: 'GreaterValue'
                    },
                    Type: 'CurrentDate'
                },
                {
                    Headers: ['To', 'Cc', 'Bcc'],
                    Keys: ['filiptest1@protonmail.com'],
                    Match: {
                        Type: 'Is'
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
                Message: 'FT1 Autoresponder message text goes here',
                Args: [],
                Type: 'Vacation'
            }
        ],
        Type: 'If'
    }
];

module.exports = {
    tree,
    simple
};

/*

 */
