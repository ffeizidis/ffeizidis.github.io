// Turn markdown-it-footnote's end-of-document footnotes into inline sidenotes
// that can be floated into the right margin beside their reference.
//
// Register AFTER markdown-it-footnote:  md.use(footnote).use(sidenotes)
// core.ruler.push appends, which guarantees we run after `footnote_tail` — and
// that matters, because `footnote_tail` is what resolves the ordering problem
// for us. Definitions are written at the bottom of the document, long after the
// references that use them; `footnote_tail` hoists them, renumbers every ref in
// *first-reference* order, and rewrites each token's meta.id. By the time any
// renderer runs, note n really is the nth note in reading order.
//
// The emitted element is a <span>, NOT an <aside>. This is not a style choice:
// `aside` (like `div`, `section`, `figure`, `details`, `p`) is in the HTML
// parser's "close any open <p>" set, so `<p>text<aside>…</aside>tail</p>` is
// re-parsed as `<p>text</p><aside>…</aside>tail<p></p>`. That destroys the
// paragraph and with it the float's line-level anchoring. The note's own inner
// paragraphs are rewritten to spans for exactly the same reason.
// role="doc-footnote" carries the semantics that the tag name no longer does.

export default function sidenotes(md, opts = {}) {
  const hostnameLabels = opts.hostnameLabels !== false;

  md.core.ruler.push("sidenote_collect", (state) => {
    const t = state.tokens;
    const open = t.findIndex((x) => x.type === "footnote_block_open");
    if (open === -1) return;
    const close = t.findIndex((x) => x.type === "footnote_block_close");

    const defs = Object.create(null);
    let current = null;
    let id = null;

    for (let i = open + 1; i < close; i++) {
      const tok = t[i];
      if (tok.type === "footnote_open") { id = tok.meta.id; current = []; continue; }
      if (tok.type === "footnote_close") { defs[id] = current; current = null; continue; }
      if (tok.type === "footnote_anchor") continue;          // drop the ↩ backreference
      if (!current) continue;

      if (tok.type === "paragraph_open" || tok.type === "paragraph_close") {
        tok.tag = "span";
        tok.block = false;                                    // no stray newlines inside a <p>
        // attrs only on the opening token: markdown-it renders them on closing
        // tags too, which would emit `</span class="sn-p">`.
        if (tok.type === "paragraph_open") tok.attrSet("class", "sn-p");
      }
      if (hostnameLabels) shortenBareLink(tok);
      current.push(tok);
    }

    state.env.sidenotes = defs;
    t.splice(open, close - open + 1);                         // drop the trailing <section>
    trimBeforeRefs(t);
  });

  md.renderer.rules.footnote_ref = (tokens, idx, options, env, self) => {
    const { id, subId } = tokens[idx].meta;
    const n = id + 1;
    const marker = `<sup class="sn-ref">${n}</sup>`;
    if (subId > 0) return marker;                             // same note cited twice: marker only

    const def = env.sidenotes && env.sidenotes[id];
    if (!def) {
      console.warn(`[sidenotes] no definition found for note ${n}`);
      return marker;
    }
    return (
      marker +
      `<span class="sidenote" role="doc-footnote">` +
        `<span class="sn-num">${n}</span> ` +
        self.render(def, options, env) +
      `</span>`
    );
  };
}

// The source spaces markers inconsistently ("ευκαιρίας». [^1]" but also
// "διαφορετική[^6]"). A marker should always hug the word it follows.
function trimBeforeRefs(tokens) {
  for (const tok of tokens) {
    if (tok.type !== "inline" || !tok.children) continue;
    const c = tok.children;
    for (let i = 1; i < c.length; i++) {
      if (c[i].type !== "footnote_ref") continue;
      const prev = c[i - 1];
      if (prev.type === "text") prev.content = prev.content.replace(/\s+$/, "");
    }
  }
}

// Most of these footnotes are a bare URL. Printing the whole thing blows out the
// margin column and forces ugly mid-word breaks, so label it with its hostname.
function shortenBareLink(tok) {
  if (tok.type !== "inline" || !tok.children) return;
  const c = tok.children;
  for (let i = 0; i < c.length - 2; i++) {
    if (c[i].type !== "link_open" || c[i + 2].type !== "link_close") continue;
    const href = c[i].attrGet("href") || "";
    const text = c[i + 1];
    if (text.type !== "text") continue;
    // linkify percent-encodes the href but leaves the visible text decoded, so
    // compare both forms — several of these URLs contain Greek or accented Latin.
    let decoded = href;
    try { decoded = decodeURI(href); } catch { /* malformed escape; use as-is */ }
    const bare = [href, decoded].some(
      (h) => text.content === h || `https://${text.content}` === h || `http://${text.content}` === h
    );
    if (!bare) continue;
    try {
      const u = new URL(href);
      text.content = u.hostname.replace(/^www\./, "");
    } catch { /* leave it alone */ }
  }
}
