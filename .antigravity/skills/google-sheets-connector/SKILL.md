---
name: google-sheets-connector
description: Expert guidance on connecting to Google Sheets via Google Apps Script (GAS)
---

# Google Sheets Connector Skill

## Definition
Use this skill when the user needs to **read** from or **write** to the Google Sheets backend.

## Rules

1.  **Transport Mechanism**: 
    - You MUST use `fetch` for all API requests.
    - Do NOT use third-party libraries for HTTP requests unless explicitly requested.

2.  **Method Handling**:
    - **Reading Data**: Use `doGet` conventions if the GAS script is set up that way, or a `POST` with an action parameter if using a unified endpoint. (Default to `fetch(url)` for read if simple, but often GAS requires `POST` to avoid caching logic complexity or payload limits). *Clarification based on user preference*: Ensure you handle `doGet` and `doPost` appropriately as requested.
    - **Writing Data**: Use `doPost`.
    - **CORS**: Remember that GAS web apps redirect. `fetch` handles redirects automatically, but you cannot read the `Response` object if the redirect goes to a different origin strictly without CORS headers. However, standard GAS `ContentService` usually handles this. *Crucial*: Ensure `mode: 'cors'` is used or understood.

3.  **UI Feedback**:
    - **Loading State**: When a data request is initiated, you **MUST** display a visible "Loading..." indicator in the UI. 
    - The indicator must remain visible until the request completes (success or failure).

4.  **Error Handling**:
    - Check `response.ok`.
    - If the response is not 200 OK, or if the JSON body contains an error status (common in GAS wrappers), you **MUST** alert the error message to the user (e.g., `alert('Error: ...')`).
    - Use `console.error` for debugging details.

## Example Pattern

```javascript
async function fetchData(url) {
  showLoading(true); // Implementation of displaying "Loading..."
  try {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (e) {
    alert('Failed to load data: ' + e.message);
    console.error(e);
  } finally {
    showLoading(false);
  }
}
```
