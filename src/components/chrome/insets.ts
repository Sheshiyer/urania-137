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
  /** Node page: nav + the top-left title block (breadcrumb, instrument title, epithet, rule). */
  navAndTitle: 210,
  /** Home: shell hairline + StatFooter. */
  footer: 104,
  /** Node page: shell hairline + PageTabs (>=sm) beside the StatFooter on the split rail. */
  tabsAndFooter: 130,
} as const
