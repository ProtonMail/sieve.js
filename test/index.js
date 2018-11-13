import test from 'ava';
import Sieve from '../sieve';
import archive from './fixtures/archive';
import folder from './fixtures/folder';
import v2 from './fixtures/v2';

test('archive to tree', t => {
    const generatedTree = Sieve.toTree(archive.simple);
    t.deepEqual(generatedTree, archive.tree);
});

// test('archive from tree', t => {
//     const generatedSimple = Sieve.fromTree(archive.tree);
//     t.deepEqual(generatedSimple, archive.simple);
// });

test('folder to tree', t => {
    const generatedTree = Sieve.toTree(folder.simple);
    t.deepEqual(generatedTree, folder.tree);
});
test('folder from tree', t => {
    const generatedSimple = Sieve.fromTree(folder.tree);
    t.deepEqual(generatedSimple, folder.simple);
});

test('v2 to tree', t => {
    const generatedTree = Sieve.toTree(v2.simple);
    t.deepEqual(generatedTree, folder.tree);
});

test('v2 from tree', t => {
    const generatedSimple = Sieve.fromTree(v2.tree);
    t.deepEqual(generatedSimple, folder.simple);
});
