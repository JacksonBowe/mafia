---
name: SST infrastructure
description: Change Mafia SST infrastructure using existing resource, binding, permission, and environment patterns.
---

Use for adding or changing AWS resources, Lambda bindings, IAM permissions, queues, schedules, realtime infrastructure, deployment configuration, or SST modules.

## Workflow

1. Inspect the nearest relevant module in `infra/` before proposing or editing a resource.
2. Reuse SST bindings and existing infrastructure patterns. Do not hardcode resource names, URLs, ARNs, or environment-specific identifiers in application code.
3. Grant the narrowest permissions needed by each function or consumer.
4. Trace required application changes: resource access, bindings, configuration, local development, and deployed behavior.
5. Keep infrastructure definitions in `infra/`; do not move deployment concerns into runtime business logic.
6. Validate with relevant static checks or tests where available.
7. Clearly state any deployment, secret, AWS-console, or database action the user must perform.

Do not deploy, mutate cloud resources, or run destructive infrastructure operations unless explicitly requested.
