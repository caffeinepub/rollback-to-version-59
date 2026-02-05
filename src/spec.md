# Specification

## Summary
**Goal:** Support negative (signed) amounts across all amount inputs and ensure calculations, styling, and reports reflect the numeric sign correctly.

**Planned changes:**
- Update Add/Edit Transaction amount inputs and validation to accept any non-zero number (positive or negative) and persist the signed value (no absolute-value conversion).
- Update Opening Balance amount-like inputs (Cash Balance, UPI Balance, Savings (10%), User Deductions) and Day-wise “Daily Deduction Amount” to accept and save negative values, and ensure ledger/balance calculations use signed values.
- Adjust local transaction mutation validation and error messaging so only zero is rejected, and negative amounts work end-to-end with React Query + localStorage updates.
- Update UI display and day-wise report/export styling logic to determine positive/negative presentation based on the numeric sign of amounts/totals (not on transaction type labels like “In/Out”).

**User-visible outcome:** Users can enter and save negative amounts in transactions, opening balances, and daily deductions; balances/totals update correctly, and negative values display/export with negative styling while positive values display/export with positive styling.
