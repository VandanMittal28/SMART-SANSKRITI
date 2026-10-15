#!/usr/bin/env python3
"""Describe the bundled visitor UI so both native shells can verify it.

`apk/scripts/build-mobile-ui.sh` calls this after it writes the Next.js export
into the Android asset folder. Android reads those files straight out of its
APK assets; iOS copies the same folder into its app bundle. Neither build
notices a partial or missing copy on its own -- the iOS target simply ships an
app that shows a blank WebView -- so this records what *should* be there.

Written to `<assets>/ui-manifest.json`:
    generatedAt, fileCount, totalBytes, routes[]

`--check` re-reads an existing manifest and fails if the folder no longer
matches it, which is what a build phase wants.
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_ASSETS = os.path.normpath(
    os.path.join(HERE, "..", "..", "apk", "app", "src", "main", "assets", "www")
)
MANIFEST_NAME = "ui-manifest.json"


def scan(assets_dir: str) -> dict:
    if not os.path.isdir(assets_dir):
        raise SystemExit(
            f"Bundled UI not found at {assets_dir}.\n"
            "Run apk/scripts/build-mobile-ui.sh (or a Gradle build) first."
        )

    file_count = 0
    total_bytes = 0
    routes: list[str] = []

    for root, dirs, files in os.walk(assets_dir):
        dirs.sort()
        for name in sorted(files):
            if name == MANIFEST_NAME:
                continue
            path = os.path.join(root, name)
            # A broken symlink would otherwise blow up os.path.getsize.
            if not os.path.isfile(path):
                continue
            file_count += 1
            total_bytes += os.path.getsize(path)
            if name == "index.html":
                relative = os.path.relpath(root, assets_dir)
                routes.append("/" if relative == "." else "/" + relative.replace(os.sep, "/") + "/")

    if not any(route == "/" for route in routes):
        raise SystemExit(
            f"{assets_dir} has no top-level index.html; the export looks incomplete."
        )

    return {
        "generatedAt": datetime.datetime.now(datetime.timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z"),
        "fileCount": file_count,
        "totalBytes": total_bytes,
        "routes": sorted(routes),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assets", default=DEFAULT_ASSETS, help="bundled UI folder")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--write", action="store_true", help="write the manifest")
    group.add_argument("--check", action="store_true", help="verify against the manifest")
    args = parser.parse_args()

    current = scan(args.assets)
    manifest_path = os.path.join(args.assets, MANIFEST_NAME)

    if args.write:
        with open(manifest_path, "w", encoding="utf-8") as handle:
            json.dump(current, handle, indent=2)
            handle.write("\n")
        print(
            f"ui-manifest: {current['fileCount']} files, "
            f"{current['totalBytes'] // 1024 // 1024} MB, "
            f"{len(current['routes'])} routes -> {manifest_path}"
        )
        return 0

    if not os.path.isfile(manifest_path):
        raise SystemExit(f"No {MANIFEST_NAME} in {args.assets}; rebuild the bundled UI.")
    with open(manifest_path, encoding="utf-8") as handle:
        recorded = json.load(handle)

    for key in ("fileCount", "totalBytes"):
        if recorded.get(key) != current[key]:
            raise SystemExit(
                f"Bundled UI does not match its manifest ({key}: "
                f"{recorded.get(key)} recorded, {current[key]} on disk). "
                "Rebuild the bundled UI."
            )
    print(f"ui-manifest: OK ({current['fileCount']} files, {len(current['routes'])} routes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
