import test from 'ava';
import archive from './fixtures/archive';
import folder from './fixtures/folder';
import v2 from './fixtures/v2';
import v1Starts from './fixtures/v1StartsEndsTest';
import v2Starts from './fixtures/v2StartsEndsTest';
import v2Attachments from './fixtures/v2Attachments';
import v2Vacation from './fixtures/v2Vacation';
import v2From from './fixtures/v2From';
import v2Complex from './fixtures/v2Complex';
import v2VacationComplex from './fixtures/v2VacationDouble';
import v2EscapeVariables from './fixtures/v2EscapeVariables';
import v2VariableManyConditionsComplex from './fixtures/v2VariableManyConditionsComplex';
import v2InvalidStructure from './fixtures/v2InvalidStructure';
import Sieve from '../src';

function testToTree(t, { simple, tree }, version = 2) {
    const copy = JSON.parse(JSON.stringify(simple));

    const generatedSimple = Sieve.toTree(simple, version);
    t.deepEqual(generatedSimple, tree);
    t.deepEqual(copy, simple);
}

function testFromTree(t, { simple, tree }, version = 2) {
    const copy = JSON.parse(JSON.stringify(tree));
    const generatedSimple = Sieve.fromTree(tree);
    t.deepEqual(generatedSimple, simple);
    t.deepEqual(copy, tree);
}

test('archive to tree', (t) => testToTree(t, archive, 1));

test('folder to tree', (t) => testToTree(t, folder, 1));
test('folder from tree', (t) => testFromTree(t, folder, 1));

test('v2 to tree', (t) => testToTree(t, v2));
test('v2 from tree', (t) => testFromTree(t, v2));

test('v2 starts with to tree', (t) => testToTree(t, v2Starts));
test('v2 starts with from tree', (t) => testFromTree(t, v2Starts));

test('v1 starts and ends with to tree', (t) => testToTree(t, v1Starts, 1));
test('v1 starts and ends with from tree', (t) => testFromTree(t, v1Starts, 1));

test('v2 attachments to tree', (t) => testToTree(t, v2Attachments));
test('v2 attachments from tree', (t) => testFromTree(t, v2Attachments));

test('v2 vacation from tree', (t) => testFromTree(t, v2Vacation));
test('v2 vacation to tree', (t) => testToTree(t, v2Vacation));

test('v2 From from tree', (t) => testFromTree(t, v2From));
test('v2 From to tree', (t) => testToTree(t, v2From));

test('v2 Complex from tree', (t) => testFromTree(t, v2Complex));
test('v2 Complex to tree', (t) => testToTree(t, v2Complex));

test('v2 Vacation Complex from tree', (t) => testFromTree(t, v2VacationComplex));

test('v2 Complex from tree with many conditions + variables', (t) => testFromTree(t, v2VariableManyConditionsComplex));

test('v2 escaped variables from tree', (t) => testFromTree(t, v2EscapeVariables));
test('v2 escaped variables to tree', (t) => testToTree(t, v2EscapeVariables));

test('v2 invalid tree', (t) => testFromTree(t, v2InvalidStructure));
