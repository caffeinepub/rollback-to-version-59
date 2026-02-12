# Specification

## Summary
**Goal:** Fix the runtime error that causes a blank screen when clicking the “Monthly” tab, and make the Monthly Transactions view resilient to common bad/partial data shapes.

**Planned changes:**
- Identify and fix the frontend runtime exception triggered when opening the Dashboard “Monthly” tab so the view renders reliably on first load.
- Add defensive handling in the Monthly Transactions UI for missing/empty description values, unexpected/unknown transactionType values, and other common data-shape issues during search/filtering to prevent crashes and provide safe fallback labels.

**User-visible outcome:** Clicking the “Monthly” tab reliably shows the Monthly Transactions view (even with no transactions), and searching/filtering no longer causes the page to go blank or throw console errors when transaction data is incomplete or unexpected.
