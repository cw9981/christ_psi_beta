---
name: psi-logic-visualizer
description: Instructions for generating the PSI (Production, Sales, Inventory) UI with Modal-based Editing
---

# PSI Logic Visualizer Skill

## Definition
Use this skill when implementing the specific PSI table view for forecasting data or multi-month data.

## Rules

1.  **Layout Logic (View Mode)**:
    - **PC First**: Optimize for desktop viewing.
    - **Horizontal Layout**: Display 6 months of data in a **single row**.
    - **ReadOnly View**: The main table should generally display text values (P, S, I) directly, **NOT** input fields.
    - **Interaction**: The user must be able to click on a specific month (or an "Edit" button within that month's column) to trigger the edit mode.

2.  **Editing Logic (Modal Mode)**:
    - **Dialog/Modal**: When a month is selected, open a **Modal/Dialog Box** to edit that month's data.
    - **Content**: The modal should contain:
        - The Month Name (Title).
        - **P (Production/Purchase)** Input Field.
        - **S (Sales)** Input Field.
        - "Save" and "Cancel" buttons.
    - **UX**: This prevents accidental edits and keeps the main view clean. Focus can be managed easily within the modal.

3.  **Data Logic (PSI)**:
    - **Calculation Scope**:
        - **Instant Feedback**: If possible, show the projected "I" (Inventory) inside the modal as the user changes P/S.
        - **Global Update**: Upon "Save", update the main table's P and S values AND strictly recalculate the **Inventory (I)** for the current month **and all subsequent months** in the frontend DOM immediately.
        - **Formula**: `I_current = I_prev + P_current - S_current`
        - Do **NOT** send a request to the backend until the user explicitly saves (or autosave on modal close if requested, but generally explicit Save is safer).

## Example Structure (Conceptual)

```html
<!-- Main View (Read-Onlyish) -->
<div class="psi-month-container" style="display: grid; grid-template-columns: repeat(6, 1fr);">
  <div class="month-column" onclick="openEditModal('Jan')">
    <div class="header">Jan</div>
    <div class="row-p">P: 200</div>
    <div class="row-s">S: 150</div>
    <div class="row-i">I: 50</div>
  </div>
  <!-- ... -->
</div>

<!-- Edit Modal (Hidden by default) -->
<dialog id="edit-modal">
  <h3>Edit Data for <span id="modal-month-name"></span></h3>
  <label>Production (P): <input type="number" id="modal-input-p"></label>
  <label>Sales (S): <input type="number" id="modal-input-s"></label>
  <div class="actions">
    <button id="btn-save">Save</button>
    <button id="btn-cancel">Cancel</button>
  </div>
</dialog>
```
