# Palette's UX Journal

## 2025-05-15 - Initial Journal Setup
**Learning:** Initializing the journal for UX and accessibility learnings.
**Action:** Always check this journal before starting UX tasks.

## 2025-05-15 - Improving Accessibility and Cart Stepper Logic
**Learning:** Found that icon-only buttons in the cart and file upload components lacked descriptive labels, hindering screen reader users. Additionally, the cart stepper lacked lower bounds (quantity could go to 0 without feedback).
**Action:** Always provide Portuguese `aria-label` for icon-only buttons and ensure interactive elements like steppers have logical bounds (`disabled` states) and provide visual feedback (`cursor-not-allowed`) during async/loading states.
