---
id: markdown-editor
title: Live Markdown Editor
summary: "Build a live-preview Markdown editor with a hand-rolled renderer and a formatting toolbar, then fix a bug where inserting formatting strands the cursor outside the textarea."
category: frontend-react
skills:
  - react-state
  - controlled-forms
  - component-design
  - text-processing
jobRoles:
  - frontend
  - fullstack
tags:
  - framework:react
  - pattern:editor
  - format:pair-programming
difficulty: hard
experienceMin: junior
experienceMax: senior
estimatedMinutes: 45
stack:
  languages:
    - typescript
  harness: component
workspace:
  files:
    - { path: MarkdownEditor.tsx, role: edit }
    - { path: markdown.ts, role: edit }
  entry: MarkdownEditor.tsx
rubric:
  - criterion: Codebase coherence
    weight: 35
    detail: "Later steps preserve earlier behavior — the live preview, every supported Markdown pattern, and the toolbar's value-insertion all keep working through the cursor fix; no regressions as the editor evolves."
  - criterion: Communication & reasoning
    weight: 35
    detail: "Explains why the parser is a pure function separate from the component, why inline code is extracted before bold/italic, and the cause of the toolbar cursor bug, grounded in their own code."
  - criterion: Trajectory
    weight: 30
    detail: "Handles the build → build → debug → explain escalation and responds well to probing (and to any checkpoint recovery)."
source: authored
status: review
version: 1
steps:
  - id: build-editor-and-live-preview
    kind: implement
    prompt: "The editor is a bare controlled textarea with no preview. Add a preview pane next to it that mirrors the typed content live — no refresh button, no separate action. `renderMarkdown` (in `markdown.ts`) is still a Step 1 placeholder that only escapes HTML special characters, so at this point the preview should just show the typed text as-is."
    verification: automated-tests
    verify: { harness: component, functionName: MarkdownEditor, tests: [tests/step-1.test.tsx] }
    weight: 25
    checkpoint: { files: [solution/step-1/MarkdownEditor.tsx] }
    hints:
      - "The textarea's value already lives in state — the preview just needs to read the same state, not a separate copy of it."
      - "'Live' means the preview re-renders as part of the same render pass that updates the textarea, driven by one shared piece of state — not a debounce, not an effect, not a button."
      - "Pass the current text straight into `renderMarkdown` and render its result — you don't need to know what that function does yet to wire this up correctly."
  - id: render-formatted-markdown-and-toolbar
    kind: implement
    prompt: "Replace the placeholder in `markdown.ts` with a real (if deliberately small) Markdown renderer: headings, bold, italic, inline code, fenced code blocks, blockquotes, ordered and unordered lists, and links. It doesn't need to handle every edge case a production parser would — focus on these patterns being correct. Then add a formatting toolbar above the editor with Bold, Italic, Heading, Quote, and Code Block buttons that insert the right syntax around whatever's currently selected in the textarea."
    verification: automated-tests
    verify: { harness: component, functionName: MarkdownEditor, tests: [tests/step-1.test.tsx, tests/step-2.test.tsx] }
    weight: 30
    checkpoint: { files: [solution/step-2/MarkdownEditor.tsx, solution/step-2/markdown.ts] }
    hints:
      - "Markdown is naturally block-structured (headings, lists, quotes, code fences are whole lines) with inline formatting (bold, italic, code, links) nested inside most blocks — handle those as two separate passes rather than one giant regex."
      - "Inline code needs to come first among the inline rules, and its contents need to be protected from the bold/italic rules that run after it — otherwise `` `*args` `` gets mangled."
      - "For the toolbar, read the textarea's `selectionStart`/`selectionEnd` to know what's selected, splice the prefix/suffix around exactly that range, and set the whole textarea value from the result."
  - id: fix-toolbar-cursor-loss
    kind: debug
    prompt: "Click into the editor, select some text, and click a toolbar button. The formatting is inserted correctly, but try to keep typing — the cursor isn't where you'd expect, and sometimes the textarea isn't even focused anymore. Reproduce it, work out why, and make sure a toolbar click leaves the user able to keep typing exactly where the insert happened."
    verification: hybrid
    verify: { harness: component, functionName: MarkdownEditor, tests: [tests/step-1.test.tsx, tests/step-2.test.tsx, tests/step-3.test.tsx] }
    rubric:
      - criterion: Diagnosis
        weight: 40
        detail: "Correctly explains that clicking a toolbar button moves focus away from the textarea, and the insert handler never restores focus or the selection afterward — so the VALUE is right but the cursor is left wherever the browser's default focus behavior puts it."
      - criterion: Sound fix
        weight: 40
        detail: "Restores focus to the textarea and sets its selection range to land after (or around) the inserted text once the new value has actually committed to the DOM — using an effect (or equivalent) rather than acting on stale DOM state; any approach with that effect is valid."
      - criterion: Communication
        weight: 20
        detail: "Articulates why setting the selection range immediately after calling the state setter doesn't work — the DOM hasn't updated yet — and why an effect keyed on the state update does."
    weight: 25
    checkpoint: { files: [solution/step-3/MarkdownEditor.tsx, solution/step-3/markdown.ts] }
    hints:
      - "Check where focus actually is right after a toolbar click, before you even worry about the exact cursor position."
      - "The insert handler computes the right new text but never touches focus or `setSelectionRange` afterward — and even if it tried to, the textarea's DOM value hasn't updated yet at that point in the handler."
      - "An effect that runs after the state update commits — keyed on some 'where the cursor should go next' piece of state — is the right place to call `.focus()` and `.setSelectionRange()`."
  - id: scale-performance-and-testing
    kind: explain
    prompt: "Two follow-ups. First: this re-parses the entire document on every keystroke — what would you change if a user pasted in a 10,000-line document and typing started to lag? Second: how would you test the parser more thoroughly than the handful of cases already covered, without hand-writing a case for every possible Markdown input?"
    verification: rubric
    verify: { harness: none }
    rubric:
      - criterion: Rendering at scale
        weight: 40
        detail: "Identifies that full re-parsing on every keystroke is the bottleneck at scale and proposes a concrete mitigation (memoizing the parse against unchanged content, debouncing the preview update, or only re-parsing the changed region) with an honest tradeoff (e.g. a debounced preview feels slightly less 'live')."
      - criterion: Parser testing strategy
        weight: 35
        detail: "Proposes testing beyond hand-picked examples — property-based/generative testing, round-trip checks, or a small corpus of representative documents — rather than only ever adding one-off cases."
      - criterion: Component decomposition
        weight: 25
        detail: "Reasons about how they'd split the single-file implementation into separate Editor/Preview/Toolbar pieces for a real codebase, and what boundary the parser module already gives them for free."
    weight: 20
    hints:
      - "Think about what actually needs to happen on every keystroke versus what could happen less often without the editor feeling any less 'live' to the user."
      - "A production Markdown parser is tested against thousands of documents, not a dozen — what property could you check automatically across many random inputs instead of asserting one exact output each time?"
---

## Overview

The candidate joins a **live Markdown editor**: a controlled textarea with no
preview and no formatting support yet. Over four steps they take it from
static to something they'd actually ship — wiring up a live preview, writing
a small hand-rolled Markdown-to-HTML renderer plus a formatting toolbar,
fixing a real cursor-management bug the toolbar introduces, and reasoning
about performance at scale and how you'd actually test a parser. This is
pitched as a senior-leaning interview: the value is in state synchronization,
rendering pipeline design, and component architecture — not in matching every
edge case a production Markdown parser would need.

## Workspace

Two files, both editable — this scenario asks for a genuine parser/UI split,
so unlike most scenarios in this library there's a second file the steps
evolve:

- **`MarkdownEditor.tsx`** *(edit, entry)* — the editor component. The
  starter renders a bare controlled textarea; the candidate adds the preview,
  the toolbar, and the cursor-restoration fix.
- **`markdown.ts`** *(edit)* — the Markdown-to-HTML renderer. The starter is
  a placeholder that only escapes HTML special characters; the candidate
  replaces it with a small renderer for headings, bold, italic, inline code,
  fenced code blocks, blockquotes, lists, and links.

The candidate should understand both in well under two minutes — the starter
is intentionally small even though the finished renderer is not.

## Reference Solutions

Authored-only; **stripped before the workspace is served**. The reference
chain is the checkpoint for each step and is what the validator executes
against the tests. Checkpoints are independent snapshots, not diffs — each
one lists every file that differs from the starter at that point, even when
a file (like the parser between Steps 2 and 3) didn't change:

- `solution/step-1/MarkdownEditor.tsx` — live preview added, mirroring the
  Step 1 placeholder's escaped-text output.
- `solution/step-2/MarkdownEditor.tsx` + `solution/step-2/markdown.ts` — the
  real renderer and the formatting toolbar. The toolbar's insert handler
  never restores focus or selection afterward — the seed of the Step 3 bug.
- `solution/step-3/MarkdownEditor.tsx` + `solution/step-3/markdown.ts` — the
  toolbar now tracks where the selection should land and an effect restores
  focus and the selection once the new value has committed; the parser is
  unchanged from Step 2.

Each is one valid implementation only. Tests assert observable behavior
(rendered structure, textarea value, focus, and selection range), so other
sound solutions (a different parser internal structure, a reducer instead of
`useState`, a different cursor-restoration mechanism) pass equally.

## Evaluation Notes

Authored-only. Step 3 is the primary discriminator: it separates candidates
who think of a controlled input's DOM state as synchronous from those who
understand it updates on commit, after React re-renders. A strong candidate
may pre-empt the bug by restoring focus/selection in Step 2 from the start —
a positive signal — in which case Step 3 becomes a discussion ("walk me
through why you needed the effect there"). The `explain` step is
discussion-only by design: performance mitigations, parser testing strategy,
and component decomposition are reasoned about, never graded on a specific
implementation, to keep every automated check implementation-agnostic.
Checkpoints on steps 1–3 let a stuck candidate keep moving without collapsing
the codebase; they recover *code*, not score.
