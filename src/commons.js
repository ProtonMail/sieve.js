import { LABEL_KEYS } from './constants';

export const buildLabelValueObject = (value) => ({
    value,
    label: LABEL_KEYS[value]
});

export const invert = (original) => Object.keys(original).reduce((obj, key) => ({ ...obj, [original[key]]: key }), {});

export const escapeCharacters = (text) => text.replace(/([*?])/g, '\\\\$1');
export const unique = (arr) => arr.filter((v, i, a) => a.indexOf(v) === i);
