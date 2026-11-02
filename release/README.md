# Releases

`release.js` builds the repository's components from HEAD and publishes
them with the catalog the [mgu Store](https://github.com/robertnisipeanu/mgu-store)
reads (its `docs/PUBLISHING.md`, "2. Catalog"): each tool with a
`native/<id>/component.json` as a tool kit, each app with an
`apps/<id>/release.json` (a source package the head unit builds).

```sh
node release/release.js list                          # versions and publish state
node release/release.js build [<id>...]               # artifacts and catalog.json into release/out/
node release/release.js check [<id>...]               # build twice, compare byte for byte
node release/release.js bump <id> <x.y.z>             # set a component's version
node release/release.js publish [<id>...] [--dry-run] # (GitHub Actions) new versions, then the catalog
MGU_PUBLISH=dir:<folder> node release/release.js publish   # a local catalog (emulator, USB stick)
node release/test/release_test.js
```

**Versions.** One version has exactly one artifact. Builds run on
`git archive HEAD` with `SOURCE_DATE_EPOCH` from the last commit that
touched what the component ships. A change to that needs a new version
(`bump`); `publish` skips a version already published with other bytes.
A tool kit holds what mgu-store's `deploy/hu artifact` packs, byte for byte.

**Catalog.** The release `catalog` holds `catalog.json` (schema 2); each
version is the release `<id>@<version>`, its artifact the one asset. An
entry's `artifact.url` is the asset's release download
(`https://github.com/<owner>/<repo>/releases/download/<tag>/<name>`) while
this repository is public, which a car without a GitHub sign-in downloads
without GitHub's API and its rate limit, and the asset's API URL while it
is private. `publish` lists the entries it carries over the same way, and
publishes the catalog when only that changed.

The 2048 app requires `mgu-render` 0.6.9 from the existing mgu-store source.
The head unit links source packages against its own SDK; no BMW SDK is shipped.

The catalog is not signed: the Store fetches it over HTTPS and checks each
artifact's size and sha256 against it.

**Publishing.** Run the Release workflow manually from `main` after head-unit
validation. It runs tests and reproducibility checks before publishing with
the workflow's short-lived `GITHUB_TOKEN`; no personal token is stored.
Normal pushes only run build checks and do not publish game releases.

## License

GPL-3.0-or-later (`LICENSE` at the repository root).
