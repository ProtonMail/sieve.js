const tree = [
    {
        'List': [
            'include',
            'environment',
            'variables',
            'relational',
            'comparator-i;ascii-numeric',
            'spamtest'
        ],
        'Type': 'Require'
    },
    {
        'List': [
            'fileinto',
            'imap4flags'
        ],
        'Type': 'Require'
    },
    {
        'Text': '# Generated: Do not run this script on spam messages\n',
        'Type': 'Comment'
    },
    {
        'If': {
            'Tests': [
                {
                    'Name': 'vnd.proton.spam-threshold',
                    'Keys': [
                        '*'
                    ],
                    'Format': null,
                    'Match': {
                        'Type': 'Matches'
                    },
                    'Type': 'Environment'
                },
                {
                    'Value': {
                        'Value': '${1}',
                        'Type': 'VariableString'
                    },
                    'Flags': [],
                    'Format': {
                        'Type': 'ASCIINumeric'
                    },
                    'Match': {
                        'Comparator': 'ge',
                        'Type': 'GreaterEqualsValue'
                    },
                    'Type': 'SpamTest'
                }
            ],
            'Type': 'AllOf'
        },
        'Then': [
            {
                'Type': 'Return'
            }
        ],
        'Type': 'If'
    }
];

const simple = {};

module.exports = {
    tree,
    simple
};
