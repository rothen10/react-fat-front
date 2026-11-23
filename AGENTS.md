<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the NestJS JWT session only in the shared in-memory session module, with private-route guards and query-cache teardown; this avoids persistent-token exposure and cross-account cached data.
- Use shared date helpers with the property's fixed UTC+01:00 offset for API serialization and response display; browser timezone must not change reservation hours.
- Read the operator calendar through authenticated GET /reservations?logementId, and render every intersecting interval per day; public calendar data cannot enforce private access or show same-day handovers reliably.
- Keep shared reservation details responsible for manager-only controls, explicit delete confirmation, and API-authoritative amounts; all entry points then have the same safety behavior.
- Surface a partially created reservation separately when a subsequent payment fails; never retry reservation creation automatically.
