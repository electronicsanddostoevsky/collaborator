# Public source and independent continuity

The public project repository is https://github.com/electronicsanddostoevsky/collaborator. It is intended to preserve the source, manifesto, and development history under the founder's account. Public source access is separate from access to the hosted community and its private data.

## What travels with this repository

- Application source, database migrations, local tool adapters, tests, the editable manifesto and rendered PDF, and platform changelog.
- Git history, including earlier implementation stages. Historical README sections describe earlier stages rather than today's full capability.
- A standard Git bundle can preserve the same history offline: `git bundle create collaborator.bundle --all`. Restore with `git clone collaborator.bundle collaborator`.

## What does not travel automatically

- Live mission database rows, object-storage artifacts, installed applications, models, personal API configuration, pairing codes, and secrets.
- Each mission has a separate export/history mechanism. A platform source backup is not a backup of the live community's data.
- The current deployment uses Sites identity headers, Cloudflare D1/R2, and Vinext. Independent hosting requires provisioning compatible storage and a trusted authentication gateway or replacing those adapters. Never expose an independent server that blindly trusts client-supplied identity headers.
- The local companion currently allows the pilot site origin explicitly. A separately operated deployment needs its own configured allowed origin and local consent flow.

## Stewardship and terms

The manifesto expresses community stewardship and opposition to private commercial appropriation. A final source license and contribution agreement have not yet been adopted. Public visibility alone must not be presented as a finalized grant of unrestricted reuse rights. Third-party dependencies retain their own terms.

The project should acquire documented, replaceable hosting and identity adapters, a complete data export/restore path, clear contribution terms, and a shared governance process. These are practical independence goals still to be completed; a GitHub repository alone cannot guarantee independence or legal priority.
