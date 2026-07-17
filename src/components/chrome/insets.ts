/**
 * Measured heights (px) of the fixed chrome that overlays the graph.
 *
 * The graph reserves these as insets so orbs and their labels can never slide
 * under the nav, the page title, the tab strip, or the stat footer — the bug
 * that let the footer overlap the bottom nodes. Keep in sync with TopNav,
 * PageHeader, PageTabs and StatFooter if their sizing changes.
 */
export const CHROME = {
  /** TopNav: py-3 + wordmark/nav row. */
  nav: 56,
  /** Node page: nav + the ornament, display title and rule from PageHeader. */
  navAndTitle: 128,
  /** Home: StatFooter only. */
  footer: 88,
  /** Node page: PageTabs (>=sm) sitting above StatFooter. Reserved on mobile
   *  too, where the tabs hide — it simply centres the mandala a little higher. */
  tabsAndFooter: 112,
} as const
