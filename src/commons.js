import { LABEL_KEYS } from './constants';

/**
 * Builds a value label object.
 * @param {String} value - a value (key of LABEL_KEYS).
 * @return {{value: String, label: String}}
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
 * Escapes the sieve specific characters. (aka *, ? and \)
 * @param {String} text
 * @return {String}
 */
export const escapeCharacters = (text) => text.replace(/([*?])/g, '\\$1').replace(/\\/g, '\\\\');

/**
 * Unescapes the sieve specific characters (*, ? and \)
 * @param {String} text
 * @return {String}
 */
export const unescapeCharacters = (text) => text.replace(/\\\\/g, '\\').replace(/\\([?*])/g, '$1');

/**
 * Remove duplicates in array.
 * @param {[]} arr
 * @return {[]} deduplicated Array.
 */
export const unique = (arr) => arr.filter((v, i, a) => a.indexOf(v) === i);
