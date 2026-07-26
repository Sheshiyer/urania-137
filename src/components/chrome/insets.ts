/**
 * Measured heights (px) of the fixed chrome that overlays the graph.
 *
 * The graph reserves these as insets so orbs and their labels can never slide
 * under the nav, the page title, the tab strip, or the stat footer — the bug
 * that let the footer overlap the bottom nodes. Keep in sync with TopNav,
 * PageHeader, PageTabs and StatFooter if their sizing changes.
 */
export const CHROME = {
  /** TopNav: pt-4 + two-tier wordmark + the gold hairline rule. */
  nav: 68,
  /** Node page: nav + the top-left title block (breadcrumb, title, epithet, rule). */
  navAndTitle: 172,
  /** Home: StatFooter only. */
  footer: 88,
  /** Node page: PageTabs (>=sm) beside the StatFooter on the split rail. */
  tabsAndFooter: 112,
} as const
