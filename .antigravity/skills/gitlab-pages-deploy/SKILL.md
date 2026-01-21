---
name: gitlab-pages-deploy
description: Standard procedure for GitLab Pages deployment
---

# GitLab Pages Deploy Skill

## Definition
Use this skill when initializing the project or preparing for release/deployment.

## Rules

1.  **Directory Structure**:
    - All static resources (HTML, CSS, JS, Images) **MUST** be placed inside the `public/` directory.
    - GitLab Pages serves content specifically from this folder.

2.  **CI/CD Configuration**:
    - You MUST generate or ensure the existence of `.gitlab-ci.yml`.
    - **Content Requirement**: The file must define a `pages` job that moves content to `public` (if not already there) and defines `artifacts: paths: - public`.
    - Since we are already working in `public/` as a best practice for this project (based on the "Directory Structure" rule), the CI script can simply copy or just expose the directory.

3.  **Pathing**:
    - **Relative Paths**: Use relative paths (e.g., `./style.css`, `./js/main.js`) in your HTML files.
    - **Reason**: GitHub Pages and GitLab Pages can be hosted in subdirectories. Absolute paths (`/style.css`) will break if the site is not at the domain root.

## Example `.gitlab-ci.yml`

```yaml
pages:
  stage: deploy
  script:
    - echo "Deploying to GitLab Pages..."
    # Assuming code is already structure correctly or built into public
    # If source is in root, move to public (unless we work directly in public)
    # For this project, we aim to keep source in public/ or move it there.
  artifacts:
    paths:
      - public
  only:
    - main
    - master
```
