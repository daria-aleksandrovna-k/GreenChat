import { createHash } from 'node:crypto'
import postcss, { type Root } from 'postcss'
import type { Plugin } from 'vite'

/** Radix Themes component classes: rt-Button, rt-DialogContent… (utilities rt-r-*, rt-variant-* are lowercase) */
const COMPONENT_CLASS = /rt-[A-Z][A-Za-z0-9]*/g
/**
 * Responsive utility variants: .xs\:rt-r-size-2. They are only needed for responsive props such as
 * size={{ initial: '1', md: '2' }}, which the project does not use. If such props are added, remove this
 * filter, otherwise they will silently stop working.
 */
const RESPONSIVE_CLASS = /\.(?:xs|sm|md|lg|xl)\\:/

export function collectRadixClasses(chunks: string[]): Set<string> {
  return new Set(chunks.flatMap((code) => code.match(COMPONENT_CLASS) ?? []))
}

/** Strips :not(...) contents (nested parentheses aware): an absent negated class does not disable a rule */
function stripNegations(selector: string): string {
  let result = ''
  let index = 0
  while (index < selector.length) {
    const start = selector.indexOf(':not(', index)
    if (start === -1) return result + selector.slice(index)
    result += selector.slice(index, start)
    let depth = 0
    let cursor = start + ':not'.length
    for (; cursor < selector.length; cursor += 1) {
      if (selector[cursor] === '(') depth += 1
      else if (selector[cursor] === ')' && --depth === 0) break
    }
    index = cursor + 1
  }
  return result
}

function isSelectorUsed(selector: string, used: Set<string>): boolean {
  if (RESPONSIVE_CLASS.test(selector)) return false
  const components = stripNegations(selector).match(/\.rt-[A-Z][A-Za-z0-9]*/g) ?? []
  return components.every((cls) => used.has(cls.slice(1)))
}

function prune(root: Root, used: Set<string>): void {
  root.walkRules((rule) => {
    // @keyframes steps (from, 50%) are not class selectors
    if (
      rule.parent?.type === 'atrule' &&
      /keyframes$/.test((rule.parent as { name: string }).name)
    ) {
      return
    }
    const kept = rule.selectors.filter((selector) => isSelectorUsed(selector, used))
    if (kept.length === 0) rule.remove()
    else if (kept.length !== rule.selectors.length) rule.selectors = kept
  })
  // Remove @media / @supports / @layer blocks left empty
  let removed = true
  while (removed) {
    removed = false
    root.walkAtRules((atRule) => {
      if (atRule.nodes && atRule.nodes.length === 0) {
        atRule.remove()
        removed = true
      }
    })
  }
}

/** Removes CSS rules of unused Radix Themes components and responsive utility variants */
export function pruneRadixCss(css: string, used: Set<string>): string {
  const root = postcss.parse(css)
  prune(root, used)
  return root.toString()
}

/** Replaces the hash in a file name (index-XXXXXXXX.css) with a hash of the new content, for correct caching */
export function withContentHash(fileName: string, source: string): string {
  const hash = createHash('sha256').update(source).digest('base64url').slice(0, 8)
  return fileName.replace(/-[A-Za-z0-9_-]{8}(\.css)$/, `-${hash}$1`)
}

/**
 * Radix Themes ships the CSS of every component in one file. Once the JS is bundled we know
 * which components are actually used, so everything else is cut from the CSS bundle.
 */
export function pruneRadixCssPlugin(): Plugin {
  return {
    name: 'prune-radix-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const files = Object.values(bundle)
      const used = collectRadixClasses(
        files.flatMap((file) => (file.type === 'chunk' ? [file.code] : [])),
      )
      for (const file of files) {
        if (file.type !== 'asset' || !file.fileName.endsWith('.css')) continue
        const source = pruneRadixCss(String(file.source), used)
        const oldName = file.fileName
        const newName = withContentHash(oldName, source)
        file.source = source
        file.fileName = newName
        delete bundle[oldName]
        bundle[newName] = file
        // There is a single CSS file (cssCodeSplit: false), referenced only from index.html
        for (const html of files) {
          if (html.type === 'asset' && html.fileName.endsWith('.html')) {
            html.source = String(html.source).replaceAll(oldName, newName)
          }
        }
      }
    },
  }
}
