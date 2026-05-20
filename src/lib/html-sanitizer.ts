/**
 * html-sanitizer.ts — single source of truth for the DOMPurify config we
 * apply before rendering LLM-produced HTML (Batch CC).
 *
 * Isomorphic: runs on both server (share page SSR) and client (artifact
 * panel + IrisChat preview). isomorphic-dompurify swaps in JSDOM on the
 * server side automatically.
 *
 * Strict but permissive enough for the rich-text our outputs need:
 * headings, lists, tables, formatting, links, images, inline styles.
 * Blocks scripts, event handlers, javascript: URIs, frames, and anything
 * else that can execute code.
 */

import DOMPurify from 'isomorphic-dompurify'

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'a', 'abbr', 'article', 'aside', 'b', 'blockquote', 'br', 'caption', 'cite', 'code',
    'col', 'colgroup', 'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt', 'em', 'figcaption',
    'figure', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'i', 'img', 'ins',
    'kbd', 'li', 'main', 'mark', 'nav', 'ol', 'p', 'pre', 'q', 's', 'samp', 'section', 'small',
    'span', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead',
    'time', 'tr', 'u', 'ul', 'wbr',
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel', 'title', 'alt', 'src', 'width', 'height', 'align', 'colspan',
    'rowspan', 'class', 'style', 'id', 'aria-label', 'aria-hidden', 'role',
  ],
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#|\/)/i,
  FORBID_TAGS: ['script', 'iframe', 'frame', 'frameset', 'object', 'embed', 'link', 'meta', 'base'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
}

/**
 * Sanitize HTML for safe rendering via dangerouslySetInnerHTML.
 * Always use this before passing untrusted (LLM-produced or user-provided)
 * HTML into a React render.
 */
export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml) return ''
  return DOMPurify.sanitize(rawHtml, SANITIZE_CONFIG)
}
