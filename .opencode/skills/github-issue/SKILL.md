---
name: GitHub issue
description: Create or refine a Mafia GitHub issue with repository context, labels, acceptance criteria, and GitHub Project assignment.
---

Use for requests to create, file, draft, or refine a GitHub issue for this repository.

## Workflow

1. Inspect relevant code, tests, and existing issues before drafting. Do not infer implementation details.
2. Keep each issue to one coherent unit of work. Split unrelated requests into separate issues.
3. Draft a concise title and body with:
   - problem or requested outcome;
   - relevant code and implementation context;
   - acceptance criteria when they make completion measurable.
4. Determine appropriate existing labels with `gh label list`. Do not invent labels.
5. If requirements or scope are ambiguous, present the draft and ask before creating the issue.
6. Create with `gh issue create`.
7. Add every created issue to the Mafia GitHub Project. Discover the project rather than guessing its number or ID.
8. Report the issue URL and assigned labels/project.

Never create an issue until the relevant repository area is inspected and scope is clear.
