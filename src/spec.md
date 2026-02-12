# Specification

## Summary
**Goal:** Color all transaction amount text consistently by transaction direction (outgoing = red, incoming = green) across every tab and transaction view, using `transactionType` rather than numeric sign.

**Planned changes:**
- Update amount rendering in Transaction History to apply red/green styling based on outgoing (cashOut, upiOut, savingsOut, deductionsOut) vs incoming (cashIn, upiIn) transaction types.
- Update Monthly Transactions on-screen table amount styling to use the same outgoing/incoming rule, and apply the same colors in the generated HTML report.
- Update Day-wise Transactions amount styling for all rendered rows so outgoing is red and incoming is green, treating derived deduction/savings rows as outgoing (red), including the generated day-wise HTML report (rows and summary lines).
- Update Filter Transactions amount styling in filtered results to use the same outgoing/incoming rule, treating derived deduction/savings rows as outgoing (red).
- Remove/avoid any amount-coloring logic that uses `Number(amount) >= 0` as the primary determinant, relying on transaction type / derived-row kind instead.

**User-visible outcome:** In every transaction list/table and generated report, outgoing amounts appear in red and incoming amounts appear in green, consistently across all tabs and views.
