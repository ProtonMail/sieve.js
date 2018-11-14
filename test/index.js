import test from 'ava';
import Sieve from '../sieve';
import archive from './fixtures/archive';
import folder from './fixtures/folder';
import v2 from './fixtures/v2';
import v2SpamTest from './fixtures/v2SpamtestOnly';

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

test('v2 with spamtest only from tree', t => testFromTree(t, v2SpamTest, 2));
