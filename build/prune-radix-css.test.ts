import { collectRadixClasses, pruneRadixCss, withContentHash } from './prune-radix-css'

const used = new Set(['rt-Button', 'rt-BaseButton'])

describe('collectRadixClasses', () => {
  it('finds Radix component classes in bundled JS', () => {
    const js = 'const a="rt-Button";x(`rt-BaseButton`, "rt-r-size", "rt-variant-solid")'
    expect([...collectRadixClasses([js])].sort()).toEqual(['rt-BaseButton', 'rt-Button'])
  })
})

describe('pruneRadixCss', () => {
  it('keeps rules of used components and drops unused ones', () => {
    const css = '.rt-Button{color:red}.rt-TableRoot{color:blue}.rt-BaseButton.rt-variant-solid{a:b}'
    expect(pruneRadixCss(css, used)).toBe(
      '.rt-Button{color:red}.rt-BaseButton.rt-variant-solid{a:b}',
    )
  })

  it('drops only the unused selectors from a selector list', () => {
    expect(pruneRadixCss('.rt-Button,.rt-TabsRoot{a:b}', used)).toBe('.rt-Button{a:b}')
  })

  it('drops responsive variants and empty at-rules', () => {
    const css =
      '.rt-r-size-1{a:b}@media (min-width:520px){.xs\\:rt-r-size-1{a:b}}@media (min-width:768px){.md\\:rt-r-gap-2{a:b}.rt-Button{c:d}}'
    expect(pruneRadixCss(css, used)).toBe(
      '.rt-r-size-1{a:b}@media (min-width:768px){.rt-Button{c:d}}',
    )
  })

  it('ignores classes inside :not() — their absence makes the rule apply, not disappear', () => {
    const callout = new Set(['rt-CalloutRoot'])
    const css = '.rt-CalloutRoot>:where(:not(.rt-CalloutIcon)){a:b}'
    expect(pruneRadixCss(css, callout)).toBe(css)
  })

  it('handles nested :not(:has(...)) with several classes', () => {
    const menu = new Set(['rt-BaseMenuContent'])
    const css =
      '.rt-BaseMenuContent:where(:not(:has(.rt-BaseMenuCheckboxItem, .rt-BaseMenuRadioItem))){a:b}'
    expect(pruneRadixCss(css, menu)).toBe(css)
  })

  it('still drops a rule when a positive class outside :not() is unused', () => {
    const css = '.rt-TableRoot:not(.rt-Button){a:b}'
    expect(pruneRadixCss(css, used)).toBe('')
  })

  it('keeps everything that is not a Radix component class', () => {
    const css =
      ':root{--x:1}.radix-themes{a:b}.rt-reset{a:b}.rt-high-contrast{a:b}@keyframes rt-spin{to{c:d}}'
    expect(pruneRadixCss(css, used)).toBe(css)
  })
})

describe('withContentHash', () => {
  it('replaces the hash in the file name with a hash of the new content', () => {
    const a = withContentHash('assets/index-KFkjlle7.css', '.a{b:c}')
    const b = withContentHash('assets/index-KFkjlle7.css', '.a{b:d}')
    expect(a).toMatch(/^assets\/index-[A-Za-z0-9_-]{8}\.css$/)
    expect(a).not.toBe('assets/index-KFkjlle7.css')
    expect(a).not.toBe(b)
    expect(withContentHash('assets/index-KFkjlle7.css', '.a{b:c}')).toBe(a)
  })
})
