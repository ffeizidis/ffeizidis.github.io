import markdownIt from "markdown-it";
import footnote from "markdown-it-footnote";
import attrs from "markdown-it-attrs";
import sidenotes from "./lib/markdown-it-sidenotes.js";

export default function (eleventyConfig) {
  const md = markdownIt({
    html: true,
    linkify: true,      // footnote 3 is a schemeless www. URL
    typographer: true,
    breaks: false,
  })
    .use(footnote)
    .use(sidenotes)     // must come after footnote — see lib/markdown-it-sidenotes.js
    .use(attrs);

  // Greek quotation marks. smartquotes only rewrites straight " and ', so
  // hand-typed «…» pass through untouched; what this fixes is the straight
  // quotes, and apostrophes in elisions like μέσ' από -> μέσ’ από.
  md.options.quotes = ["«", "»", "“", "”"];

  // markdown-it 15 ships fuzzyLink off, so schemeless URLs stay plain text.
  // Footnote 3 of the Gracián post is a bare `www.biblionet.gr/...`.
  md.linkify.set({ fuzzyLink: true });

  eleventyConfig.setLibrary("md", md);

  eleventyConfig.addPassthroughCopy({ "src/css": "css", "src/fonts": "fonts" });

  // Bare numeral dates: 06.09.2026
  eleventyConfig.addFilter("stamp", (d) => {
    const p = (n) => String(n).padStart(2, "0");
    return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
  });
  eleventyConfig.addFilter("iso", (d) => d.toISOString());

  eleventyConfig.addCollection("posts", (c) =>
    c.getFilteredByGlob("src/posts/*.md").sort((a, b) => b.date - a.date)
  );

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
