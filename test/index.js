import test from 'ava';
import Sieve from '../sieve';
import archive from './fixtures/archive';
import folder from './fixtures/folder';
import v2 from './fixtures/v2';
import v2SpamTest from './fixtures/v2SpamtestOnly';
import v1Starts from './fixtures/v1StartsEndsTest';
import v2Starts from './fixtures/v2StartsEndsTest';
import v2Attachments from './fixtures/v2Attachments';
import v2Vacation from './fixtures/v2Vacation';

function testToTree (t, {simple, tree}, version = 1) {
    const generatedSimple = Sieve.toTree(simple, version);
    t.deepEqual(generatedSimple, tree);
}

function testFromTree (t, {simple, tree}, version = 1) {
    const generatedSimple = Sieve.fromTree(tree, version);
    t.deepEqual(generatedSimple, simple);
}

test('archive to tree', t => testToTree(t, archive));

// test('archive from tree', t => {
//     const generatedSimple = Sieve.fromTree(archive.tree);
//     t.deepEqual(generatedSimple, archive.simple);
// });

test('folder to tree', t => testToTree(t, folder));
test('folder from tree', t => testFromTree(t, folder));

test('v2 to tree', t => testToTree(t, v2, 2));
test('v2 from tree', t => testFromTree(t, v2, 2));

// test('complex to tree', t => testToTree(t, complex, 2));
// test('complex from tree', t => testFromTree(t, complex, 2));

test('v2 with spamtest only from tree', t => testFromTree(t, v2SpamTest, 2));

test('v2 starts with to tree', t => testToTree(t, v2Starts, 2));
test('v2 starts with from tree', t => testFromTree(t, v2Starts, 2));

test('v1 starts and ends with to tree', t => testToTree(t, v1Starts, 1));
test('v1 starts and ends with from tree', t => testFromTree(t, v1Starts, 1));

test('v2 attachments to tree', t => testToTree(t, v2Attachments, 2));
test('v2 attachments from tree', t => testFromTree(t, v2Attachments, 2));

test('v2 vacation from tree', t => testFromTree(t, v2Vacation, 2));
test('v2 vacation to tree', t => testToTree(t, v2Vacation, 2));
