# Music Playlist Simulator // Doubly Linked List Queue

A dark, futuristic Ops Dashboard implementation of a **Music Playlist Simulator** engineered for college Data Structures courses. The core of this system is a hand-written, bidirectional **Doubly Linked List (DLL)** that dynamically transitions into a **Circular Doubly Linked List** to power "Repeat All" queue playback.

All list logic is implemented purely through **explicit pointer manipulation (`prev` and `next`)** without relying on JavaScript arrays or built-in collection structures for queue storage.

---

## 1. Project Architecture & File Separation

```
c:\DS Project\
├── index.html       # Futuristic ops dashboard markup with status bar, hero card, stat cards, visualizer & console
├── style.css        # Pure black #000000 background, 40px grid overlay, Orbitron & Inter fonts, accent glows
├── playlist.js      # Pure Data Structure logic: SongNode & Playlist classes (ZERO DOM dependencies)
├── script.js        # UI Controller: Web Audio synth, playback timer, pointer visualizer & audit logs
├── tests.js         # Comprehensive unit test suite with 32 assertion checkpoints (Node.js & browser runnable)
└── README.md        # Academic explanation, complexity tables, viva guide & execution manual
```

---

## 2. Table of Operations & Time Complexities

| Method | Operation Description | Time Complexity | Auxiliary Space | Pointer Updates |
| :--- | :--- | :---: | :---: | :--- |
| `addSong(song)` | Append track to queue (tail) | **$O(1)$** | $O(1)$ | `tail.next = newNode`, `newNode.prev = tail`, `tail = newNode` |
| `addAtHead(song)` | Prepend track to queue (head) | **$O(1)$** | $O(1)$ | `newNode.next = head`, `head.prev = newNode`, `head = newNode` |
| `addAtPosition(song, i)` | Insert track at arbitrary index `i` | **$O(n)$** | $O(1)$ | Splices node between $(i-1)$ and $(i)$ with 4 pointer reassignments |
| `removeSong(idOrIndex)` | Remove node by title or index | **$O(n)$** | $O(1)$ | $O(n)$ search + $O(1)$ pointer unlinking & safe `current` advance |
| `nextTrack()` | Shift playback pointer forward | **$O(1)$** | $O(1)$ | `current = current.next`; stops at tail (linear) or wraps to head (circular) |
| `previousTrack()` | Shift playback pointer backward | **$O(1)$** | $O(1)$ | `current = current.prev`; stops at head (linear) or wraps to tail (circular) |
| `playSong(index)` | Direct jump to index | **$O(n)$** | $O(1)$ | Bidirectional traversal to node, sets `current = node` |
| `enableRepeatAll()` | Convert DLL to Circular DLL | **$O(1)$** | $O(1)$ | `tail.next = head; head.prev = tail;` |
| `disableRepeatAll()` | Break circular links (Linear) | **$O(1)$** | $O(1)$ | `tail.next = null; head.prev = null;` |
| `moveUp(i)` | Reorder node with predecessor | **$O(n)$** | $O(1)$ | **Swaps node links** (not data payload) |
| `moveDown(i)` | Reorder node with successor | **$O(n)$** | $O(1)$ | **Swaps node links** (not data payload) |
| `reverse()` | In-place list inversion | **$O(n)$** | $O(1)$ | Traverses nodes, swaps `next` & `prev` for each, swaps `head` & `tail` |
| `shuffle()` | Fisher-Yates random ordering | **$O(n)$** | $O(n)$ refs | Shuffles node references and reconstructs all bidirectional pointers |
| `search(title)` | Linear search by song title | **$O(n)$** | $O(k)$ matches | Circular-safe linear traversal up to `size` nodes |
| `getTotalDuration()` | Calculate combined track seconds | **$O(n)$** | $O(1)$ | Circular-safe accumulator loop bounded by `size` |
| `clear()` | Deallocate queue pointers | **$O(n)$** | $O(1)$ | Unlinks all nodes for garbage collection, resets head/tail/current |

---

## 3. Data Structure Implementation Details

### 3.1 Node Structure (`SongNode`)
Each song is encapsulated inside a heap node:
```javascript
class SongNode {
  constructor(title, artist, duration, audioUrl = null) {
    this.title = title;
    this.artist = artist;
    this.duration = duration;     // seconds
    this.audioUrl = audioUrl;     // Blob object URL or local media source
    this.prev = null;            // Pointer to predecessor
    this.next = null;            // Pointer to successor
    this.memAddress = '0x' + ...; // Simulated 16-bit hex address for viva inspection
    this.id = 'node_' + ...;
  }
}
```

### 3.2 Linear vs. Circular Doubly Linked List Topology

#### Linear Mode (`isCircular = false`):
In linear mode, the boundaries are capped with `null`:
```
   NULL <--- [ HEAD ] <===========> [ NODE 2 ] <===========> [ TAIL ] ---> NULL
```
- `head.prev = null`
- `tail.next = null`
- Calling `nextTrack()` at `tail` returns `END_OF_PLAYLIST`.
- Calling `previousTrack()` at `head` returns `START_OF_PLAYLIST`.

#### Circular Mode (`isCircular = true` - Repeat All Enabled):
In circular mode, the terminal boundaries are cross-linked:
```
           +----------------- tail.next -------------------+
           |                                               |
           V                                               |
       [ HEAD ] <=============> [ NODE 2 ] <=============> [ TAIL ]
           |                                               ^
           +----------------- head.prev -------------------+
```
- `tail.next = head`
- `head.prev = tail`
- Calling `nextTrack()` at `tail` wraps seamlessly to `head` in $O(1)$.
- Calling `previousTrack()` at `head` wraps seamlessly to `tail` in $O(1)$.

### 3.3 Circular-Safe Traversal Technique
In standard linked lists, traversals iterate while `current !== null`. However, in a Circular Linked List, `current` **never becomes `null`**, causing infinite loops.

To guarantee circular safety, all internal traversals in `playlist.js` (`toArray`, `search`, `getTotalDuration`, `getNodeAt`, `clear`, `reverse`) use a counter bounded by `this.size`:
```javascript
let curr = this.head;
let count = 0;
while (curr && count < this.size) {
  // Process node...
  curr = curr.next;
  count++;
}
```

---

## 4. Academic Viva Deep Dive: Pointer Manipulations

### 4.1 Node Deletion: 5 Handled Edge Cases (`removeSong`)
Deleting from a doubly linked list requires rigorous boundary inspection:
1. **Single Node Remaining (`size === 1`)**:
   - `head = null; tail = null; current = null; size = 0;`
2. **Node is Head (`node === head`)**:
   - `head = node.next`
   - If circular: `head.prev = tail; tail.next = head;`
   - Else: `head.prev = null;`
3. **Node is Tail (`node === tail`)**:
   - `tail = node.prev`
   - If circular: `tail.next = head; head.prev = tail;`
   - Else: `tail.next = null;`
4. **Middle Node**:
   - `node.prev.next = node.next;`
   - `node.next.prev = node.prev;`
5. **Currently Playing Node (`current === node`)**:
   - The playback pointer is automatically protected and shifted to `node.next` (or wrapped in circular mode) before the node is severed.

### 4.2 Reordering by Swapping Links (`_swapAdjacent`)
Unlike naive implementations that simply swap the `title` or `artist` strings, this project swaps the actual **memory link pointers**.

Given two adjacent nodes `nodeA` and `nodeB` (`nodeA.next === nodeB`):
```javascript
const nodeBefore = nodeA.prev;
const nodeAfter = nodeB.next;

// Update outer bounds
if (this.head === nodeA) this.head = nodeB;
if (this.tail === nodeB) this.tail = nodeA;

// Relink predecessor
if (nodeBefore) {
  nodeBefore.next = nodeB;
  nodeB.prev = nodeBefore;
}

// Relink adjacent pair
nodeB.next = nodeA;
nodeA.prev = nodeB;

// Relink successor
if (nodeAfter) {
  nodeA.next = nodeAfter;
  nodeAfter.prev = nodeA;
}
```

### 4.3 In-Place Reversal Algorithm (`reverse`)
Reversal is achieved in **$O(n)$ time** and **$O(1)$ auxiliary space**:
```javascript
let current = this.head;
let count = 0;

while (count < this.size) {
  const originalNext = current.next;
  // Swap next and prev pointers
  current.next = current.prev;
  current.prev = originalNext;

  current = originalNext;
  count++;
}

// Swap head and tail pointers
const oldHead = this.head;
this.head = this.tail;
this.tail = oldHead;
```

---

## 5. UI Features & Ops Dashboard Design

- **Dynamic Background Video & Cyber Aesthetic**: Fullscreen looping `background.mp4` with a dark frosted glass overlay (`rgba(0, 0, 0, 0.68)`, `backdrop-filter: blur(4px)`) and a subtle $40\text{px}$ grid overlay.
- **Adaptive Color Theming**: A dynamic HTML5 Canvas color sampler periodically samples frames from `background.mp4` to extract dominant vibrant colors and dynamically injects them into `--accent-primary`, glowing borders, and visualizer rails. A cyber ambient palette is used as a fallback if `file://` CORS restricts canvas extraction.
- **Real Local Media Playback Engine**: Real HTML5 Audio (`<audio id="realAudioPlayer">`) plays uploaded local `.mp3`, `.mp4`, `.m4a` files with live duration auto-detection, seeking via scrubber, and automated pointer transitions on track completion (`ended`).
- **Typography**: Google Font **Orbitron** for futuristic headlines, numbers, and status indicators; **Inter** for readable body text; **JetBrains Mono** for memory addresses and logs.
- **Row of 4 Stat Cards**:
  1. `Total Tracks`: `size` property of the linked list.
  2. `Now Playing`: Title and hex address of node pointed to by `current`.
  3. `Mode`: Linear vs. Circular (Repeat All).
  4. `Total Duration`: Combined runtime formatted as `mm:ss`.
- **Live Data Structure Visualizer**:
  - Horizontal graphic track displaying each node with simulated memory addresses (`0x4A1E`).
  - Next ($\to$) and Prev ($\leftarrow$) directional arrows.
  - Floating status pins: `[HEAD]`, `[TAIL]`, and animated `[CURRENT]`.
  - Glowing curved rails for Circular Mode (`tail.next = head` and `head.prev = tail`).
  - Click any node to open the **Node Memory Inspector Modal**.
- **Real-Time Ops Console**: Monospace audit terminal streaming timestamped operations (`[OP]`, `[CIRCULAR]`, `[MUTATION]`, `[DELETE]`).

---

## 6. How to Run & Test

### Option A: Open in Browser
Double-click `index.html` or open it with any modern web browser:
```bash
# Windows PowerShell
Start-Process "index.html"
```

### Option B: Run Unit Test Suite in Node.js
The project includes a standalone test suite with **32 assertions** covering all list operations, pointer integrity, and edge cases:
```bash
node tests.js
```

---

## 7. Sample Viva Q&A Cheat Sheet

**Q: Why use a Doubly Linked List instead of an Array for a music playlist?**  
*A: In an array, inserting or deleting songs at the beginning or middle requires shifting all subsequent elements, taking $O(n)$ time. In a Doubly Linked List, once a node reference is known, inserting or deleting takes $O(1)$ time by adjusting pointer references. Additionally, bidirectional navigation (`nextTrack` and `previousTrack`) takes true $O(1)$ constant time.*

**Q: How does Repeat All work without duplicating data?**  
*A: Repeat All converts the Doubly Linked List into a Circular Doubly Linked List in $O(1)$ time by linking `tail.next = head` and `head.prev = tail`. No nodes are duplicated.*

**Q: How do you prevent infinite loops during traversal in Circular Mode?**  
*A: We never rely on checking `current != null`. Instead, all traversals iterate up to `this.size` steps, ensuring that exactly one pass through the queue is performed.*

**Q: When moving a song up or down, why not just swap the song title and artist?**  
*A: Swapping data values is a superficial trick that breaks pointer identity. If other subsystems hold a reference to that specific node (such as the `current` playback pointer), changing the payload without moving the node corrupts state. Real data structures reorder nodes by rewiring the `prev` and `next` pointers.*
