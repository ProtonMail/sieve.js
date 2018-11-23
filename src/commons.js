import { LABEL_KEYS } from './constants';

/**
 * Builds a value label object.
 * @param {string} value - a value (key of LABEL_KEYS).
 * @return {{value: string, label: string}}
 */
export const buildLabelValueObject = (value) => ({
    value,
    label: LABEL_KEYS[value]
});

/**
 * Inverts an object.
 * @param {{}} original
 * @return {{}}
 */
export const invert = (original) => Object.keys(original).reduce((obj, key) => ({ ...obj, [original[key]]: key }), {});

/**
 * Escapces the sieve specific characters. (aka * and ?)
 * @param {string} text
 * @return {string}
 */
export const escapeCharacters = (text) => text.replace(/([*?])/g, '\\\\$1');

/**
 * Remove duplicates in array.
 * @param {[]} arr
 * @return {[]} deduplicated array.
 */
export const unique = (arr) => arr.filter((v, i, a) => a.indexOf(v) === i);
