/**
 * TESTS.JS
 * 
 * Comprehensive Unit Test Suite for Doubly Linked List Playlist.
 * Can be run via Node.js (`node tests.js`) or invoked in-browser from UI.
 */

const isNode = typeof module !== 'undefined' && module.exports;
let SongNodeClass, PlaylistClass;

if (isNode) {
  const lib = require('./playlist.js');
  SongNodeClass = lib.SongNode;
  PlaylistClass = lib.Playlist;
} else {
  SongNodeClass = window.SongNode;
  PlaylistClass = window.Playlist;
}

const testResults = [];

function assert(condition, testName, details = '') {
  const result = {
    name: testName,
    passed: Boolean(condition),
    details: details
  };
  testResults.push(result);
  const statusBadge = result.passed ? '✓ PASS' : '✗ FAIL';
  const color = result.passed ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';
  
  if (isNode) {
    console.log(`${color}${statusBadge}${reset} | ${testName}${details ? ' - ' + details : ''}`);
  }
  return result.passed;
}

function runAllPlaylistTests() {
  testResults.length = 0;

  if (isNode) {
    console.log('\n======================================================');
    console.log('   DATA STRUCTURES VIVA TEST SUITE: DOUBLY LINKED LIST');
    console.log('======================================================\n');
  }

  // TEST 1: Initial empty state
  const pl = new PlaylistClass();
  assert(pl.size === 0 && pl.head === null && pl.tail === null && pl.current === null, 
    'Initial State', 'Empty playlist initialized correctly');

  // TEST 2: Insertion at tail (addSong)
  const s1 = pl.addSong({ title: 'Song 1', artist: 'Artist A', duration: 200 });
  assert(pl.size === 1 && pl.head === s1 && pl.tail === s1 && pl.current === s1,
    'addSong (First Node)', 'Single node becomes head, tail, and current');
  assert(s1.prev === null && s1.next === null,
    'addSong Pointers (Linear)', 'Single node has null prev and next in linear mode');

  const s2 = pl.addSong({ title: 'Song 2', artist: 'Artist B', duration: 180 });
  assert(pl.size === 2 && pl.head === s1 && pl.tail === s2,
    'addSong (Second Node)', 'Head remains s1, tail becomes s2');
  assert(s1.next === s2 && s2.prev === s1 && s2.next === null && s1.prev === null,
    'addSong Pointers Linking', 'Bidirectional pointers correctly set between s1 and s2');

  const s3 = pl.addSong({ title: 'Song 3', artist: 'Artist C', duration: 240 });
  assert(pl.size === 3 && pl.tail === s3 && s2.next === s3 && s3.prev === s2,
    'addSong (Third Node)', 'Tail is s3, linked properly to s2');

  // TEST 3: Insertion at head (addAtHead)
  const s0 = pl.addAtHead({ title: 'Song 0', artist: 'Artist Zero', duration: 150 });
  assert(pl.size === 4 && pl.head === s0 && s0.next === s1 && s1.prev === s0 && s0.prev === null,
    'addAtHead', 's0 becomes new head, previous head.prev points to s0');

  // TEST 4: Insertion at index (addAtPosition)
  const sMid = pl.addAtPosition({ title: 'Song 1.5', artist: 'Artist Mid', duration: 120 }, 2);
  assert(pl.size === 5 && s1.next === sMid && sMid.prev === s1 && sMid.next === s2 && s2.prev === sMid,
    'addAtPosition (Middle)', 'sMid spliced between s1 and s2 with 4 link updates');

  // TEST 5: Boundary navigation in Linear mode
  pl.current = pl.head; // Song 0
  const prevAtHead = pl.previousTrack();
  assert(prevAtHead.status === 'START_OF_PLAYLIST' && pl.current === pl.head,
    'previousTrack at Head (Linear)', 'Stops at boundary without crashing');

  pl.current = pl.tail; // Song 3
  const nextAtTail = pl.nextTrack();
  assert(nextAtTail.status === 'END_OF_PLAYLIST' && pl.current === pl.tail,
    'nextTrack at Tail (Linear)', 'Stops at boundary without crashing');

  // TEST 6: Circular Mode (Repeat All) Links
  pl.enableRepeatAll();
  assert(pl.isCircular === true, 'enableRepeatAll flag', 'isCircular set to true');
  assert(pl.tail.next === pl.head && pl.head.prev === pl.tail,
    'enableRepeatAll Pointers', 'tail.next links to head, head.prev links to tail');

  // TEST 7: Circular Navigation (Wraparound)
  pl.current = pl.tail; // Song 3
  const wrapNext = pl.nextTrack();
  assert(wrapNext.status === 'SUCCESS' && pl.current === pl.head,
    'nextTrack Circular Wrap', 'nextTrack wraps from tail directly to head');

  const wrapPrev = pl.previousTrack();
  assert(wrapPrev.status === 'SUCCESS' && pl.current === pl.tail,
    'previousTrack Circular Wrap', 'previousTrack wraps from head directly to tail');

  // Circular-safe traversal verification
  const duration = pl.getTotalDuration();
  assert(duration === (150 + 200 + 120 + 180 + 240),
    'Circular-Safe Traversal (Duration)', `Calculated ${duration}s without infinite loop`);

  const arrayExport = pl.toArray();
  assert(arrayExport.length === 5 && arrayExport[0].title === 'Song 0' && arrayExport[4].title === 'Song 3',
    'Circular-Safe toArray()', 'Exported exactly 5 nodes in correct sequential order');

  // TEST 8: Disable Repeat All
  pl.disableRepeatAll();
  assert(pl.isCircular === false && pl.tail.next === null && pl.head.prev === null,
    'disableRepeatAll', 'Broke circular links: tail.next = null, head.prev = null');

  // TEST 9: Swapping adjacent nodes via moveUp and moveDown
  // Current order: [0: Song 0, 1: Song 1, 2: Song 1.5, 3: Song 2, 4: Song 3]
  pl.moveUp(2); // Move Song 1.5 UP (swap with Song 1)
  // New order: [Song 0, Song 1.5, Song 1, Song 2, Song 3]
  assert(pl.getNodeAt(1).title === 'Song 1.5' && pl.getNodeAt(2).title === 'Song 1',
    'moveUp (Middle Nodes)', 'Swapped links of Song 1.5 and Song 1');
  assert(pl.getNodeAt(1).next === pl.getNodeAt(2) && pl.getNodeAt(2).prev === pl.getNodeAt(1),
    'moveUp Pointer Integrity', 'Bidirectional links between swapped nodes are verified');

  pl.moveDown(1); // Move Song 1.5 DOWN (swap back with Song 1)
  assert(pl.getNodeAt(1).title === 'Song 1' && pl.getNodeAt(2).title === 'Song 1.5',
    'moveDown', 'Swapped links back correctly');

  // TEST 10: In-place Reversal (reverse())
  // List before reverse: [Song 0, Song 1, Song 1.5, Song 2, Song 3]
  pl.reverse();
  // List after reverse: [Song 3, Song 2, Song 1.5, Song 1, Song 0]
  assert(pl.head.title === 'Song 3' && pl.tail.title === 'Song 0',
    'reverse() Head and Tail', 'Head is now Song 3 and Tail is Song 0');
  assert(pl.head.prev === null && pl.tail.next === null,
    'reverse() Boundary Links (Linear)', 'head.prev is null, tail.next is null');
  assert(pl.head.next.title === 'Song 2' && pl.tail.prev.title === 'Song 1',
    'reverse() Internal Links', 'Internal pointers flipped accurately');

  // Restore original order by reversing again
  pl.reverse();
  assert(pl.head.title === 'Song 0' && pl.tail.title === 'Song 3',
    'reverse() Twice (Idempotence)', 'Reversing twice restores original order');

  // TEST 11: Linear Search O(n)
  const searchResults = pl.search('Song 1.5');
  assert(searchResults.length === 1 && searchResults[0].index === 2,
    'search() Query', 'Found matching node at index 2');

  // TEST 12: Deletion (removeSong)
  // 12a. Delete middle node (Song 1.5 at index 2)
  const removedMid = pl.removeSong(2);
  assert(removedMid.title === 'Song 1.5' && pl.size === 4,
    'removeSong (Middle Node)', 'Size reduced to 4, node unlinked');
  assert(pl.getNodeAt(1).title === 'Song 1' && pl.getNodeAt(1).next.title === 'Song 2',
    'removeSong Middle Link Healing', 'Song 1 now points directly to Song 2');

  // 12b. Delete Head (Song 0)
  const removedHead = pl.removeSong(0);
  assert(removedHead.title === 'Song 0' && pl.head.title === 'Song 1' && pl.head.prev === null,
    'removeSong (Head Node)', 'Head advanced to Song 1 with head.prev = null');

  // 12c. Delete Tail (Song 3)
  const removedTail = pl.removeSong(pl.size - 1);
  assert(removedTail.title === 'Song 3' && pl.tail.title === 'Song 2' && pl.tail.next === null,
    'removeSong (Tail Node)', 'Tail retracted to Song 2 with tail.next = null');

  // Remaining list: [Song 1, Song 2]
  assert(pl.size === 2, 'Remaining Size', 'Exactly 2 nodes remaining');

  // 12d. Delete currently playing song
  pl.current = pl.head; // Song 1
  pl.removeSong('Song 1'); // Deleting current song
  assert(pl.current !== null && pl.current.title === 'Song 2',
    'removeSong (Current Playing Track)', 'Current pointer safely advanced to Song 2');

  // 12e. Delete the last remaining node (Size 1 -> Size 0)
  pl.removeSong(0);
  assert(pl.size === 0 && pl.head === null && pl.tail === null && pl.current === null,
    'removeSong (Last Remaining Node)', 'Playlist reset cleanly to empty state');

  const allPassed = testResults.every(r => r.passed);
  if (isNode) {
    console.log('\n======================================================');
    console.log(`TOTAL TESTS: ${testResults.length} | PASSED: ${testResults.filter(r => r.passed).length} | FAILED: ${testResults.filter(r => !r.passed).length}`);
    console.log(`OVERALL RESULT: ${allPassed ? 'ALL TESTS PASSED SUCCESSFULLY! ✓' : 'FAILURES DETECTED! ✗'}`);
    console.log('======================================================\n');
  }

  return {
    total: testResults.length,
    passed: testResults.filter(r => r.passed).length,
    failed: testResults.filter(r => !r.passed).length,
    results: testResults
  };
}

if (isNode) {
  runAllPlaylistTests();
}

if (typeof window !== 'undefined') {
  window.runAllPlaylistTests = runAllPlaylistTests;
}
