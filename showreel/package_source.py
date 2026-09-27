"""Bundle portable editable source; rendering outputs and installed tools stay out."""
from pathlib import Path
import sys
import zipfile

ROOT = Path(__file__).resolve().parent
destination = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "out" / "Blurb_showreel_v6_source.zip"
destination.parent.mkdir(parents=True, exist_ok=True)
excluded = {"node_modules", "out", "__pycache__", ".git"}
with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as bundle:
    for item in sorted(ROOT.rglob("*")):
        relative = item.relative_to(ROOT)
        if not item.is_file() or any(part in excluded for part in relative.parts):
            continue
        if item.suffix in {".log", ".zip", ".pyc"}:
            continue
        bundle.write(item, Path("Blurb_showreel_v6_source") / relative)
print(destination)
