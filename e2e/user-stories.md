# User Stories — Autonomous Coding Dashboard
# Format: "- <story description>" — one story per line
# Used by: j ui-review, /ui-review command, agentic-ui-review.spec.ts

## Auth
- user can reach the login page from the root URL
- user sees an error message when submitting empty login form
- user can log in with valid credentials and reach the dashboard
- user is redirected to login when accessing a protected route while logged out
- user can log out and is returned to the public landing page

## Dashboard Core
- authenticated user can view the main dashboard without errors
- dashboard shows project list or empty state when no projects exist
- user can navigate between main sections using the sidebar
- page title updates correctly when navigating between sections

## Projects
- user can create a new project from the dashboard
- user can view the project list and see at least one project after creating one
- user can open a project detail page
- user can edit a project name
- user can delete a project and it is removed from the list

## Features / Tasks
- user can add a feature to a project
- user can mark a feature as complete
- user can reorder features in the list
- user can filter features by status

## Settings
- user can reach the settings page
- user can update their profile information
- form shows validation error on invalid input

## Responsive / Accessibility
- dashboard is usable on mobile viewport (375px wide)
- all interactive elements are keyboard-navigable
- page has no obvious broken layouts at 1280px width

## API Health (background)
- health endpoint responds with 200 and json body
- rate-limit endpoint responds without error
