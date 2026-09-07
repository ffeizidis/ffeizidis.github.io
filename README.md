# zenfeedbacker.github.io

A small static site: a list of posts and an about page. Built with
[Eleventy](https://www.11ty.dev/), deployed to GitHub Pages by Actions on every
push to `main`.

## Working on it

    npm install
    npm run serve      # http://localhost:8080, live reload
    npm run build      # -> _site/

## Publishing a post

Posts are written in the Obsidian vault and copied in explicitly — the vault is
outside the repo, so CI can only see what has been committed.

    node tools/import.mjs "~/Documents/mine/vault/Κείμενα/Some Note.md" some-slug --title "Ο τίτλος"

That adds `title`/`date` frontmatter (the date comes from the vault file's mtime,
because git does not preserve mtimes), normalises footnote definitions and
flattens Obsidian `[[wikilinks]]`, which are not standard Markdown.

## How the layout works

Body text runs in a centre column, section headings sit in the left margin
beside the paragraph they introduce, and footnotes become sidenotes in the right
margin beside their reference. Both margins are floats with a negative margin,
so they take no width from the text column.

`[^1]` footnotes are converted to inline sidenotes at build time by
`lib/markdown-it-sidenotes.js` — the published pages ship no JavaScript at all.

Before changing `src/css/type.css`, read the invariants comment at the top of it.
Three ordinary-looking CSS changes will silently break the margins.

## Fonts

EB Garamond, self-hosted, subset by script:

    npm run fonts
