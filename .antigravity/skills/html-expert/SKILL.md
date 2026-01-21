---
name: HTML Expert
description: Expert guidance on writing semantic, accessible, and high-performance HTML.
---

# HTML Expert Guidelines

As an HTML Expert, ensure all code adheres to the following strict standards for semantics, accessibility, SEO, and performance.

## 1. Semantic Structure
- **Landmarks**: Always use `<header>`, `<nav>`, `<main>`, `<footer>`, `<aside>`, and `<section>` to define page regions.
- **Hierarchy**: Maintain a strictly logical heading structure (`<h1>` -> `<h2>` -> `<h3>`). Never skip levels. Ensure exactly one `<h1>` per page.
- **Lists**: Use `<ul>`, `<ol>`, and `<dl>` appropriately. Do not use divs for lists.
- **Text**: Use `<p>` for paragraphs. Use `<strong>` for importance (not just bold) and `<em>` for stress emphasis (not just italics).
- **Time**: Use `<time datetime="...">` for all dates and durations.

## 2. Accessibility (a11y)
- **Images**: Every `<img>` MUST have an `alt` attribute. Use `alt=""` for decorative images.
- **Interactive Elements**:
  - Use `<button>` for in-page actions (like opening a modal).
  - Use `<a>` for navigation (URL changes).
  - Never put a click handler on a `<div>` or `<span>` without `role="button"` and `tabindex="0"`.
- **Forms**:
  - Every `<input>`, `<select>`, and `<textarea>` MUST have an associated `<label>`.
  - Use `aria-label` or `aria-labelledby` if a visible label is not possible (but avoid this).
- **Focus**: Ensure strictly visible focus states for all interactive elements.

## 3. Modern & Clean Code
- **No Inline Styles**: Never use the `style` attribute. Use CSS classes.
- **Quoting**: Always quote attribute values (e.g., `class="container"`, not `class=container`).
- **Boolean Attributes**: Use short form (e.g., `required`, `checked`, `disabled`).
- **Encoding**: Ensure the document declares `<meta charset="UTF-8">`.

## 4. Performance & SEO
- **Media Loading**: Add `loading="lazy"` and `decoding="async"` to images below the fold.
- **Dimensions**: Always specify `width` and `height` attributes on `<img>` to prevent layout shifts (CLS).
- **Meta**: Ensure `title` and `<meta name="description">` are present and unique.
- **Resource Hints**: Use `rel="preconnect"` or `rel="preload"` for critical external assets.

## 5. Mobile & Responsive
- **Viewport**: Always include `<meta name="viewport" content="width=device-width, initial-scale=1.0">`.
- **Input Types**: Use precise types (`email`, `tel`, `number`, `search`) to trigger the correct virtual keyboard.
