/**
 * Measured heights (px) of the chrome reserved inside each graph field.
 *
 * The graph reserves these as insets so orbs and their labels can never slide
 * under the nav, the page title, the tab strip, or the stat footer — the bug
 * that let the footer overlap the bottom nodes. Keep in sync with TopNav,
 * PageHeader, PageTabs and StatFooter if their sizing changes.
 */
export const CHROME = {
  /** Home orientation and primary action inside the route field. */
  homeContext: 118,
  /** Node page top-left title block inside the route field. */
  nodeTitle: 176,
  /** Home: shell hairline + StatFooter. */
  footer: 120,
  /** Node page: shell hairline + PageTabs (>=sm) beside the StatFooter on the split rail. */
  tabsAndFooter: 130,
} as const
