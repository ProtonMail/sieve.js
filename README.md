[![CircleCI](https://circleci.com/gh/ProtonMail/sieve.js.svg?style=svg)](https://circleci.com/gh/ProtonMail/sieve.js)

# Sieve.js

JavaScript library to wrap sieve configuration

### Simple representation

```js
{
    Operator: {
        label: '',
        value: 'AllOf' // 'AnyOf'
    },
    Conditions: [
        {
            Comparator: {
                value: 'contains' // 'is', 'matches', 'starts', 'ends'
            },
            Values: ['thomas.anderson@protonmail.com']
        }
    ],
    Actions: {
        FileInto: ['trash'],
        Mark: {
            Read: false,
            Starred: false
        },
        Vacation: 'Not here for few days'
    }
}
```

## Test

`npm test`
