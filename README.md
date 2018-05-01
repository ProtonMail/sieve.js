# sieve.js

Javascript library to wrap sieve configuration

### Simple repreentation

``` javascript
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
