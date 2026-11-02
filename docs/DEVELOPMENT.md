# Development notes

## Validation

Game rules, controller input, persistence, rendering, the mocked OAP
lifecycle and renderer wire protocol are covered by automated tests.
Builds are checked for reproducibility and Git history is scanned for secrets.

Head-unit emulator and physical controller/display validation have not
been completed. Desktop checks do not establish car-runtime compatibility.

## Packaging

Source packages contain no BMW SDK modules or built `javascript/app.js`.
The head unit links each app with its own SDK. Local SDK donors and
head-unit emulator environments are not part of this repository.

See [release tooling](../release/README.md) for build and publish commands.
