# Specification

## Summary
**Goal:** Restore the app’s custom date-picker styling and improve month/year-based transaction viewing and filtering in Monthly and Overview tabs.

**Planned changes:**
- Re-apply the existing modern (non-default) calendar/date-picker styling to the date picker UI used in the Filter and Daywise tabs.
- In the Monthly tab, add a control to switch between Month view and Year view, with year selection and correct year-scoped transaction display.
- In the Overview tab, default tile drilldowns (e.g., Cash In/UPI In/Cash Out/UPI Out) to showing only the current month’s transactions, and add an Archive month (month+year) selector to view older months with a clear reset back to current month.
- Ensure all new/updated user-facing text is in English and that filtering is done client-side using already-fetched transactions.

**User-visible outcome:** Date pickers in Filter and Daywise look styled again (not default), Monthly can be viewed by month or by year, and Overview tile transactions show the current month by default with an Archive option to browse a selected past month.
