/**
 * Base CSS Styles for WeChat Compatibility
 * These are essential styles that ensure proper rendering in WeChat
 * They should be prepended to theme CSS to provide fallbacks
 */

export const BASE_WECHAT_CSS = `
/* Base styles for WeChat compatibility */

/* List styles - ensure markers are visible */
ul {
  list-style-type: disc !important;
  padding-left: 2em !important;
  margin: 1em 0;
}

ol {
  list-style-type: decimal !important;
  padding-left: 2em !important;
  margin: 1em 0;
}

li {
  display: list-item !important;
  margin: 0.3em 0;
}

/* Container base */
.md-container {
  line-height: 1.8;
  color: #333;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* Code block base */
pre {
  overflow-x: auto;
  background: #f6f8fa;
  border-radius: 6px;
  margin: 1em 0;
}

pre code {
  display: block;
  padding: 1em;
  white-space: pre-wrap;
  word-break: break-all;
}

/* Table base */
table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

th, td {
  border: 1px solid #ddd;
  padding: 8px;
}

th {
  background: rgba(0, 0, 0, 0.05);
}

/* Image base */
img {
  max-width: 100%;
  height: auto;
}

/* Link base */
a {
  color: #576b95;
  text-decoration: none;
}

/* Blockquote base */
blockquote {
  margin: 1em 0;
  padding: 1em;
  border-left: 4px solid #ddd;
  background: rgba(0, 0, 0, 0.03);
}

/* Horizontal rule */
hr {
  border: none;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  margin: 1.5em 0;
}
`
