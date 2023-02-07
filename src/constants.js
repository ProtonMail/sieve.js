export const LABEL_KEYS = {
    all: 'All',
    any: 'Any',
    subject: 'Subject',
    sender: 'Sender',
    recipient: 'Recipient',
    attachments: 'Attachments',
    contains: 'contains',
    '!contains': 'does not contain',
    is: 'is exactly',
    '!is': 'is not',
    matches: 'matches',
    '!matches': 'does not match',
    starts: 'begins with',
    '!starts': 'does not begin with',
    ends: 'ends with',
    '!ends': 'does not end with'
};
export const MATCH_KEYS = {
    is: 'Is',
    contains: 'Contains',
    matches: 'Matches',
    starts: 'Starts',
    ends: 'Ends',
    default: 'Defaults'
};
export const OPERATOR_KEYS = {
    all: 'AllOf',
    any: 'AnyOf'
};
export const V1 = 1;
export const V2 = 2;

export const TEST_NODES = {
    attachment: [
        {
            Headers: ['X-Attached'],
            Type: 'Exists'
        }
    ],
    dollar: [
        {
            Name: 'dollar',
            Value: '$',
            Flags: [],
            Type: 'Set'
        }
    ]
};
