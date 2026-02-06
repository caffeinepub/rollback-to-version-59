# Specification

## Summary
**Goal:** Make the computed 10% savings and user-defined cheeti deductions appear as visible transaction rows across all transaction list views without changing stored data.

**Planned changes:**
- Add derived, read-only transaction rows for “10% Savings” and “Cheeti Deduction” to Transaction History, Day-wise Transactions, Filter Transactions results, and Monthly Transactions (only when the computed amounts are non-zero for a date).
- Ensure derived rows are clearly labeled in English and visually distinguishable from user-entered transactions, while remaining non-editable and non-deletable.
- Source derived amounts from existing localStorage data and do not create any new persisted transaction records for these rows.
- Update list grouping/sorting so derived rows appear under the correct date with consistent ordering across views, and ensure existing summaries/stats are not double-counted due to UI-only rows.
- Resolve any frontend TypeScript/type mismatches caused by introducing derived display rows without changing backend canister interfaces.
- Fix the current build/deployment failure so the app builds and deploys successfully with these changes.

**User-visible outcome:** Users see “10% Savings” and “Cheeti Deduction” as additional, clearly marked rows in history/daily/filter/monthly transaction lists (when applicable), reflecting deductions from main balance and additions to savings/cheeti, without being able to edit or delete them.
