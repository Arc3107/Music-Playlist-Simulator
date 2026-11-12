/**
 * PLAYLIST.JS
 * 
 * College Data Structures Course - Music Playlist Simulator
 * Hand-written Doubly Linked List Implementation.
 * 
 * CORE RULES:
 * - NO built-in Array, Map, Set, or list methods for playlist storage.
 * - All queue operations are performed via pointer manipulation (prev / next).
 * - Traversal helpers are strictly circular-safe (bounded by `this.size`).
 * - playlist.js is 100% decoupled from the DOM for standalone testability.
 */

/**
 * Class representing a single node in the Doubly Linked List.
 */
class SongNode {
  /**
   * @param {string} title - Song title
   * @param {string} artist - Artist or band name
   * @param {number} duration - Track duration in seconds
   * @param {string|null} audioUrl - Optional audio/video source URL (blob: or http:)
   */
  constructor(title, artist, duration, audioUrl = null) {
    this.title = String(title).trim();
    this.artist = String(artist).trim();
    this.duration = Math.max(1, parseInt(duration, 10) || 180);
    this.audioUrl = audioUrl || null;

    // Pointer to the preceding song in the queue
    this.prev = null;

    // Pointer to the subsequent song in the queue
    this.next = null;

    // Simulated 16-bit hex memory address for academic pointer visualization
    this.memAddress = '0x' + Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1).toUpperCase();
    
    // Unique identifier for tracking node identity across pointer mutations
    this.id = 'node_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
  }
}

/**
 * Class representing the Doubly Linked List Queue.
 */
class Playlist {
  constructor() {
    /** @type {SongNode|null} Pointer to the first song in the queue */
    this.head = null;

    /** @type {SongNode|null} Pointer to the last song in the queue */
    this.tail = null;

    /** @type {SongNode|null} Pointer to the currently playing song node */
    this.current = null;

    /** @type {number} Total number of nodes in the playlist */
    this.size = 0;

    /** @type {boolean} Flag indicating whether queue wraps tail.next -> head */
    this.isCircular = false;
  }

  // =========================================================================
  // INSERTION OPERATIONS
  // =========================================================================

  /**
   * Append a song to the end (tail) of the playlist.
   * Time Complexity: O(1) - Constant time due to direct tail pointer reference.
   * 
   * Pointer surgery:
   * 1. If empty: head = tail = current = newNode. If circular, link to itself.
   * 2. If non-empty:
   *    newNode.prev = tail
   *    tail.next = newNode
   *    tail = newNode
   *    If circular: tail.next = head, head.prev = tail
   *    Else: tail.next = null
   * 
   * @param {{title: string, artist: string, duration: number}|SongNode} song
   * @returns {SongNode} The newly inserted node
   */
  addSong(song) {
    const newNode = song instanceof SongNode 
      ? song 
      : new SongNode(song.title, song.artist, song.duration, song.audioUrl || null);

    if (this.size === 0) {
      this.head = newNode;
      this.tail = newNode;
      this.current = newNode;

      if (this.isCircular) {
        this.head.next = this.head;
        this.head.prev = this.head;
      } else {
        this.head.next = null;
        this.head.prev = null;
      }
    } else {
      newNode.prev = this.tail;
      this.tail.next = newNode;
      this.tail = newNode;

      if (this.isCircular) {
        this.tail.next = this.head;
        this.head.prev = this.tail;
      } else {
        this.tail.next = null;
      }
    }

    this.size++;
    return newNode;
  }

  /**
   * Insert a song at the beginning (head) of the playlist.
   * Time Complexity: O(1) - Constant time due to direct head pointer reference.
   * 
   * Pointer surgery:
   * 1. If empty: same as addSong.
   * 2. If non-empty:
   *    newNode.next = head
   *    head.prev = newNode
   *    head = newNode
   *    If circular: head.prev = tail, tail.next = head
   *    Else: head.prev = null
   * 
   * @param {{title: string, artist: string, duration: number}|SongNode} song
   * @returns {SongNode} The newly inserted node
   */
  addAtHead(song) {
    const newNode = song instanceof SongNode 
      ? song 
      : new SongNode(song.title, song.artist, song.duration, song.audioUrl || null);

    if (this.size === 0) {
      return this.addSong(newNode);
    }

    newNode.next = this.head;
    this.head.prev = newNode;
    this.head = newNode;

    if (this.isCircular) {
      this.head.prev = this.tail;
      this.tail.next = this.head;
    } else {
      this.head.prev = null;
    }

    this.size++;
    return newNode;
  }

  /**
   * Insert a song at an arbitrary 0-based index.
   * Time Complexity: O(n) - Linear traversal to find the node at index i.
   * 
   * Pointer surgery:
   * 1. i = 0 -> delegate to addAtHead (O(1)).
   * 2. i = size -> delegate to addSong (O(1)).
   * 3. 0 < i < size:
   *    Locate target node currently at position i (`currNode`).
   *    newNode.prev = currNode.prev
   *    newNode.next = currNode
   *    currNode.prev.next = newNode
   *    currNode.prev = newNode
   * 
   * @param {{title: string, artist: string, duration: number}|SongNode} song
   * @param {number} index - 0-based index position
   * @returns {SongNode|null} The inserted node or null if index is out of bounds
   */
  addAtPosition(song, index) {
    if (typeof index !== 'number' || isNaN(index) || index < 0 || index > this.size) {
      return null;
    }

    if (index === 0) {
      return this.addAtHead(song);
    }

    if (index === this.size) {
      return this.addSong(song);
    }

    const currNode = this.getNodeAt(index);
    if (!currNode) return null;

    const newNode = song instanceof SongNode 
      ? song 
      : new SongNode(song.title, song.artist, song.duration, song.audioUrl || null);

    const prevNode = currNode.prev;

    // Splice newNode between prevNode and currNode
    newNode.prev = prevNode;
    newNode.next = currNode;
    prevNode.next = newNode;
    currNode.prev = newNode;

    this.size++;
    return newNode;
  }

  // =========================================================================
  // DELETION OPERATIONS
  // =========================================================================

  /**
   * Remove a song by title or by 0-based index.
   * Time Complexity: O(n) - Linear search to locate node by index or title.
   * 
   * Handles all 5 critical edge cases:
   * 1. Only node in playlist (size == 1)
   * 2. Node is head
   * 3. Node is tail
   * 4. Node is in the middle
   * 5. Node is the currently playing song (advances current pointer safely)
   * 
   * @param {string|number} titleOrIndex
   * @returns {SongNode|null} The removed node, or null if not found
   */
  removeSong(titleOrIndex) {
    if (this.size === 0) return null;

    let targetNode = null;

    // Check if parameter is a numeric index
    if (typeof titleOrIndex === 'number') {
      targetNode = this.getNodeAt(titleOrIndex);
    } else if (typeof titleOrIndex === 'string') {
      // Linear traversal by title
      const searchTitle = titleOrIndex.trim().toLowerCase();
      let curr = this.head;
      let count = 0;

      while (curr && count < this.size) {
        if (curr.title.toLowerCase() === searchTitle) {
          targetNode = curr;
          break;
        }
        curr = curr.next;
        count++;
      }
    }

    if (!targetNode) return null;

    return this.removeNode(targetNode);
  }

  /**
   * Internal pointer surgery to remove a specific node reference.
   * Time Complexity: O(1) once node reference is resolved.
   * 
   * @param {SongNode} node - Target node to unlink
   * @returns {SongNode} The unlinked node
   */
  removeNode(node) {
    if (!node || this.size === 0) return null;

    // Edge Case 5: The song being deleted is currently playing
    if (this.current === node) {
      if (this.size === 1) {
        this.current = null;
      } else if (node === this.tail) {
        // If tail is deleted: in circular wrap to head, else fall back to prev
        this.current = this.isCircular ? this.head : node.prev;
      } else {
        // Move to next song
        this.current = node.next;
      }
    }

    // Edge Case 1: Single node remaining
    if (this.size === 1) {
      this.head = null;
      this.tail = null;
      this.current = null;
      this.size = 0;
      node.prev = null;
      node.next = null;
      return node;
    }

    // Edge Case 2: Node is Head
    if (node === this.head) {
      this.head = node.next;
      if (this.isCircular) {
        this.head.prev = this.tail;
        this.tail.next = this.head;
      } else {
        this.head.prev = null;
      }
    }
    // Edge Case 3: Node is Tail
    else if (node === this.tail) {
      this.tail = node.prev;
      if (this.isCircular) {
        this.tail.next = this.head;
        this.head.prev = this.tail;
      } else {
        this.tail.next = null;
      }
    }
    // Edge Case 4: Middle Node
    else {
      node.prev.next = node.next;
      node.next.prev = node.prev;
    }

    // Isolate deleted node pointers
    node.prev = null;
    node.next = null;
    this.size--;

    return node;
  }

  // =========================================================================
  // PLAYBACK & POINTER NAVIGATION
  // =========================================================================

  /**
   * Advance the playback pointer to the next track.
   * Time Complexity: O(1) - Constant time pointer jump.
   * 
   * Boundary Handling:
   * - If at tail in LINEAR mode: stops and returns { status: 'END_OF_PLAYLIST' }
   * - If at tail in CIRCULAR mode: wraps around to head via tail.next
   * 
   * @returns {{ status: string, node: SongNode|null }}
   */
  nextTrack() {
    if (this.size === 0 || !this.current) {
      return { status: 'EMPTY_PLAYLIST', node: null };
    }

    if (this.current === this.tail && !this.isCircular) {
      return { status: 'END_OF_PLAYLIST', node: this.current };
    }

    const previousCurrent = this.current;
    this.current = this.current.next;

    return { 
      status: 'SUCCESS', 
      node: this.current, 
      from: previousCurrent, 
      wrapped: previousCurrent === this.tail && this.isCircular 
    };
  }

  /**
   * Move the playback pointer to the previous track.
   * Time Complexity: O(1) - Constant time pointer jump.
   * 
   * Boundary Handling:
   * - If at head in LINEAR mode: stops and returns { status: 'START_OF_PLAYLIST' }
   * - If at head in CIRCULAR mode: wraps around to tail via head.prev
   * 
   * @returns {{ status: string, node: SongNode|null }}
   */
  previousTrack() {
    if (this.size === 0 || !this.current) {
      return { status: 'EMPTY_PLAYLIST', node: null };
    }

    if (this.current === this.head && !this.isCircular) {
      return { status: 'START_OF_PLAYLIST', node: this.current };
    }

    const previousCurrent = this.current;
    this.current = this.current.prev;

    return { 
      status: 'SUCCESS', 
      node: this.current, 
      from: previousCurrent, 
      wrapped: previousCurrent === this.head && this.isCircular 
    };
  }

  /**
   * Jump current playback pointer to a specific 0-based index.
   * Time Complexity: O(n) - Linear traversal to find node at index.
   * 
   * @param {number} index
   * @returns {SongNode|null}
   */
  playSong(index) {
    const node = this.getNodeAt(index);
    if (node) {
      this.current = node;
      return node;
    }
    return null;
  }

  /**
   * Jump current playback pointer directly to a given node reference.
   * Time Complexity: O(1)
   * 
   * @param {SongNode} node
   */
  playNode(node) {
    if (node && node instanceof SongNode) {
      this.current = node;
      return node;
    }
    return null;
  }

  // =========================================================================
  // CIRCULAR QUEUE MODE (REPEAT ALL)
  // =========================================================================

  /**
   * Convert Doubly Linked List into a Circular Doubly Linked List.
   * Time Complexity: O(1) - Connects tail.next = head and head.prev = tail.
   * 
   * Visual pointer state:
   * [head] <==========================> [tail]
   *   |                                   ^
   *   +--- head.prev = tail               |
   *   +----------------- tail.next = head +
   */
  enableRepeatAll() {
    this.isCircular = true;
    if (this.head && this.tail) {
      this.tail.next = this.head;
      this.head.prev = this.tail;
    }
    return true;
  }

  /**
   * Break circular links, restoring linear Doubly Linked List boundaries.
   * Time Complexity: O(1) - Sets tail.next = null and head.prev = null.
   */
  disableRepeatAll() {
    this.isCircular = false;
    if (this.tail) {
      this.tail.next = null;
    }
    if (this.head) {
      this.head.prev = null;
    }
    return false;
  }

  /**
   * Toggle between Circular (Repeat All) and Linear playback.
   * @returns {boolean} New isCircular status
   */
  toggleRepeatAll() {
    if (this.isCircular) {
      this.disableRepeatAll();
    } else {
      this.enableRepeatAll();
    }
    return this.isCircular;
  }

  // =========================================================================
  // REORDERING & STRUCTURAL MUTATIONS (NODE LINK SWAPPING)
  // =========================================================================

  /**
   * Swap two adjacent nodes in the Doubly Linked List by modifying their
   * link pointers (next and prev). Data properties remain untouched!
   * Time Complexity: O(1) once nodes are identified.
   * 
   * @private
   * @param {SongNode} nodeA - First node
   * @param {SongNode} nodeB - Second node (must be nodeA.next)
   */
  _swapAdjacent(nodeA, nodeB) {
    if (!nodeA || !nodeB || nodeA === nodeB || nodeA.next !== nodeB) {
      return false;
    }

    // Special Case: Size 2
    if (this.size === 2) {
      this.head = nodeB;
      this.tail = nodeA;

      if (this.isCircular) {
        nodeB.next = nodeA;
        nodeB.prev = nodeA;
        nodeA.next = nodeB;
        nodeA.prev = nodeB;
      } else {
        nodeB.prev = null;
        nodeB.next = nodeA;
        nodeA.prev = nodeB;
        nodeA.next = null;
      }
      return true;
    }

    const nodeBefore = nodeA.prev;
    const nodeAfter = nodeB.next;

    // 1. Update Head pointer if nodeA was head
    if (this.head === nodeA) {
      this.head = nodeB;
    }

    // 2. Update Tail pointer if nodeB was tail
    if (this.tail === nodeB) {
      this.tail = nodeA;
    }

    // 3. Link nodeBefore to nodeB
    if (nodeA === this.head) {
      // If nodeA was original head
      if (this.isCircular) {
        this.tail.next = nodeB;
        nodeB.prev = this.tail;
      } else {
        nodeB.prev = null;
      }
    } else {
      nodeBefore.next = nodeB;
      nodeB.prev = nodeBefore;
    }

    // 4. Link nodeB with nodeA
    nodeB.next = nodeA;
    nodeA.prev = nodeB;

    // 5. Link nodeA with nodeAfter
    if (nodeB === this.tail) {
      // If nodeB was original tail
      if (this.isCircular) {
        nodeA.next = this.head;
        this.head.prev = nodeA;
      } else {
        nodeA.next = null;
      }
    } else {
      nodeA.next = nodeAfter;
      nodeAfter.prev = nodeA;
    }

    return true;
  }

  /**
   * Move node at index i UP (towards head) by swapping node links with its predecessor.
   * Time Complexity: O(n) to traverse to index i, O(1) pointer surgery.
   * 
   * @param {number} i - 0-based index of node to move up
   * @returns {boolean} Success status
   */
  moveUp(i) {
    if (typeof i !== 'number' || i <= 0 || i >= this.size) {
      return false;
    }

    const currNode = this.getNodeAt(i);
    if (!currNode || !currNode.prev) return false;

    const prevNode = currNode.prev;
    return this._swapAdjacent(prevNode, currNode);
  }

  /**
   * Move node at index i DOWN (towards tail) by swapping node links with its successor.
   * Time Complexity: O(n) to traverse to index i, O(1) pointer surgery.
   * 
   * @param {number} i - 0-based index of node to move down
   * @returns {boolean} Success status
   */
  moveDown(i) {
    if (typeof i !== 'number' || i < 0 || i >= this.size - 1) {
      return false;
    }

    const currNode = this.getNodeAt(i);
    if (!currNode || !currNode.next) return false;

    const nextNode = currNode.next;
    return this._swapAdjacent(currNode, nextNode);
  }

  /**
   * Reverse the entire Doubly Linked List in-place by swapping next and prev pointers.
   * Time Complexity: O(n) - Single traversal visiting every node once.
   * Auxiliary Space: O(1) - Pure pointer reassignment without extra list allocation.
   * 
   * Algorithm:
   * 1. Traverse each node up to `this.size` times (circular safe).
   * 2. For each node, swap its `prev` and `next` pointers.
   * 3. Swap list `head` and `tail` pointers.
   * 4. If circular, re-lock circular boundaries: head.prev = tail, tail.next = head.
   *    If linear, clear boundary pointers: head.prev = null, tail.next = null.
   */
  reverse() {
    if (this.size <= 1) return;

    let current = this.head;
    let count = 0;

    // Circular-safe traversal
    while (count < this.size) {
      // Swap next and prev pointers of current node
      const originalNext = current.next;
      current.next = current.prev;
      current.prev = originalNext;

      // Advance to next node using originalNext
      current = originalNext;
      count++;
    }

    // Swap head and tail pointers of the list
    const oldHead = this.head;
    this.head = this.tail;
    this.tail = oldHead;

    // Restore boundary links
    if (this.isCircular) {
      this.head.prev = this.tail;
      this.tail.next = this.head;
    } else {
      if (this.head) this.head.prev = null;
      if (this.tail) this.tail.next = null;
    }
  }

  /**
   * Randomly reorder all nodes using the Fisher-Yates shuffle algorithm.
   * Traverses node references into a temporary collection, shuffles references,
   * and rebuilds all pointer links (prev/next) from scratch.
   * Time Complexity: O(n)
   */
  shuffle() {
    if (this.size <= 1) return;

    // Collect references to existing nodes (temporary traversal)
    const nodes = [];
    let curr = this.head;
    let count = 0;
    while (curr && count < this.size) {
      nodes.push(curr);
      curr = curr.next;
      count++;
    }

    // Fisher-Yates shuffle on node references
    for (let i = nodes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = nodes[i];
      nodes[i] = nodes[j];
      nodes[j] = temp;
    }

    // Reconstruct all pointers based on new sequence
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].prev = (i > 0) ? nodes[i - 1] : null;
      nodes[i].next = (i < nodes.length - 1) ? nodes[i + 1] : null;
    }

    this.head = nodes[0];
    this.tail = nodes[nodes.length - 1];

    if (this.isCircular) {
      this.tail.next = this.head;
      this.head.prev = this.tail;
    } else {
      this.head.prev = null;
      this.tail.next = null;
    }
  }

  // =========================================================================
  // SEARCH & TRAVERSAL HELPERS (CIRCULAR-SAFE)
  // =========================================================================

  /**
   * Linear search for songs matching a given title query.
   * Time Complexity: O(n) - Circular safe traversal bounded by size.
   * 
   * @param {string} title
   * @returns {Array<{node: SongNode, index: number}>} Matching nodes with indices
   */
  search(title) {
    const results = [];
    if (!title || this.size === 0) return results;

    const query = String(title).trim().toLowerCase();
    let curr = this.head;
    let index = 0;

    while (curr && index < this.size) {
      if (curr.title.toLowerCase().includes(query)) {
        results.push({ node: curr, index });
      }
      curr = curr.next;
      index++;
    }

    return results;
  }

  /**
   * Retrieve node reference at 0-based index.
   * Time Complexity: O(n) with bidirectional optimization:
   * - If index < size / 2, traverse forward from head.
   * - If index >= size / 2, traverse backward from tail.
   * 
   * @param {number} index
   * @returns {SongNode|null}
   */
  getNodeAt(index) {
    if (typeof index !== 'number' || isNaN(index) || index < 0 || index >= this.size) {
      return null;
    }

    // Optimization: traverse from closest boundary
    if (index < this.size / 2) {
      let curr = this.head;
      let count = 0;
      while (curr && count < index) {
        curr = curr.next;
        count++;
      }
      return curr;
    } else {
      let curr = this.tail;
      let count = this.size - 1;
      while (curr && count > index) {
        curr = curr.prev;
        count--;
      }
      return curr;
    }
  }

  /**
   * Find 0-based index of a node reference.
   * Time Complexity: O(n)
   * 
   * @param {SongNode} targetNode
   * @returns {number} Index, or -1 if not found
   */
  indexOf(targetNode) {
    if (!targetNode || this.size === 0) return -1;

    let curr = this.head;
    let index = 0;
    while (curr && index < this.size) {
      if (curr === targetNode || curr.id === targetNode.id) {
        return index;
      }
      curr = curr.next;
      index++;
    }
    return -1;
  }

  /**
   * Calculate total duration of all tracks in seconds.
   * Time Complexity: O(n)
   * 
   * @returns {number} Total seconds
   */
  getTotalDuration() {
    let total = 0;
    let curr = this.head;
    let count = 0;

    while (curr && count < this.size) {
      total += curr.duration;
      curr = curr.next;
      count++;
    }

    return total;
  }

  /**
   * Reset the entire list and deallocate pointers.
   * Time Complexity: O(n) to break cyclical references for GC.
   */
  clear() {
    let curr = this.head;
    let count = 0;

    while (curr && count < this.size) {
      const next = curr.next;
      curr.prev = null;
      curr.next = null;
      curr = next;
      count++;
    }

    this.head = null;
    this.tail = null;
    this.current = null;
    this.size = 0;
  }

  /**
   * Export list nodes as an array of plain objects solely for UI rendering.
   * Time Complexity: O(n) - Strictly circular-safe.
   * 
   * @returns {Array<{
   *   id: string,
   *   memAddress: string,
   *   title: string,
   *   artist: string,
   *   duration: number,
   *   isHead: boolean,
   *   isTail: boolean,
   *   isCurrent: boolean,
   *   prevTitle: string|null,
   *   nextTitle: string|null,
   *   prevAddress: string|null,
   *   nextAddress: string|null
   * }>}
   */
  toArray() {
    const list = [];
    if (this.size === 0 || !this.head) return list;

    let curr = this.head;
    let count = 0;

    while (curr && count < this.size) {
      list.push({
        id: curr.id,
        memAddress: curr.memAddress,
        title: curr.title,
        artist: curr.artist,
        duration: curr.duration,
        audioUrl: curr.audioUrl || null,
        isHead: curr === this.head,
        isTail: curr === this.tail,
        isCurrent: curr === this.current,
        prevTitle: curr.prev ? curr.prev.title : (this.isCircular ? this.tail.title : null),
        nextTitle: curr.next ? curr.next.title : (this.isCircular ? this.head.title : null),
        prevAddress: curr.prev ? curr.prev.memAddress : null,
        nextAddress: curr.next ? curr.next.memAddress : null
      });

      curr = curr.next;
      count++;
    }

    return list;
  }
}

// Export for Node.js test environment if available
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SongNode, Playlist };
}
