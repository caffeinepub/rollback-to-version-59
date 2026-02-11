# Specification

## Summary
**Goal:** Enhance the Monthly Transactions tab to support viewing derived “Cheeti Deduction” and “Savings (10%)” rows and enable description-based partial search.

**Planned changes:**
- Add two new selectable options to the Monthly tab “Transaction Type” dropdown: “Cheeti Deduction” and “Savings (10%)”, alongside existing transaction types.
- When either new option is selected, populate the monthly table with the corresponding derived rows for the selected month using existing localStorage-derived sources (no backend changes; no persistence of these rows as transactions), and compute totals from only the displayed derived rows.
- Add a Description search input to the Monthly tab that filters the currently displayed results via case-insensitive substring matching as the user types, safely handling rows with missing descriptions.

**User-visible outcome:** In the Monthly tab, users can select “Cheeti Deduction” or “Savings (10%)” to see month-specific derived rows and accurate totals, and can instantly filter the current monthly results by typing part of a transaction description.
