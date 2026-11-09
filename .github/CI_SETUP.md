# Frontend CI setup

Place this repository's files at the root of your planning-sap GitHub repository.
CI runs on pushes, pull requests and manual runs using GitHub-hosted Ubuntu.
No agent, self-hosted runner or repository secret is required. Node 22.14.0 runs
npm ci against package-lock.json, unit tests and the TypeScript/Vite build.
The frontend-dist artifact contains dist/ and is retained for seven days.
This workflow does not deploy the site.

No origin remote is configured locally. The upstream remote is the original
template repository. Create your own repository and add its URL as origin.
Commit and push reviewed application source, package.json, package-lock.json,
tests and .github files, including required currently untracked modules.
Exclude .env and node_modules.

In Settings > Actions > General, enable Actions and allow the official actions
referenced by ci.yml. Open Actions > Frontend CI to inspect runs. Manual Run
workflow is available once the workflow is on the default branch. After a
successful run, optionally require **Frontend tests and build** in branch rules.
GitHub-hosted runner usage limits apply.

The Chrome diagnostic needs a running app and is excluded from unit tests.
Repository-wide lint and formatting are not gates because of existing violations.
For environment-specific builds, explicitly map non-secret VITE_* repository
variables into the build step. Vite exposes these values to browsers; API secrets
belong on the backend.

https://docs.github.com/en/actions/how-tos/manage-runners/github-hosted-runners/use-github-hosted-runners
