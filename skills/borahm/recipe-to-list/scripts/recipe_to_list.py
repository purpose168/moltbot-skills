#!/usr/bin/env python3
"""recipe_to_list.py

Extract ingredients from a recipe/cookbook photo using Gemini (Flash) and add to Todoist.

Env:
  - GEMINI_API_KEY or GOOGLE_API_KEY
  - TODOIST_API_TOKEN (used by `todoist` CLI)

Notes:
  - Uses Gemini Generative Language API (v1beta) with inline image data.
  - Expects/requests strict JSON output; falls back to best-effort extraction.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import subprocess
import sys
import urllib.request
import urllib.error
from datetime import date
from fractions import Fraction
from pathlib import Path
from typing import Iterable

API_URL_TMPL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"

PROMPT = (
    "You are extracting a recipe's ingredient list from a cookbook/recipe photo.\n"
    "Return STRICT JSON only, no markdown, no commentary.\n"
    "Schema: {\"title\": string, \"items\": string[], \"notes\": string}.\n"
    "Rules:\n"
    "- title: short recipe name if visible; otherwise empty string\n"
    "- items: individual shopping list entries, one ingredient per array element\n"
    "- keep quantities when present (e.g., '3/4 cup olive oil')\n"
    "- ignore step numbers/instructions\n"
    "- if an ingredient has options, keep them with slashes (e.g., 'Parmesan or pecorino')\n"
)


def _die(msg: str, code: int = 2) -> None:
    print(msg, file=sys.stderr)
    raise SystemExit(code)


def _read_bytes(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()


def _guess_mime(path: str) -> str:
    p = path.lower()
    if p.endswith(".png"):
        return "image/png"
    if p.endswith(".webp"):
        return "image/webp"
    return "image/jpeg"


def gemini_extract_items(image_path: str, model: str, api_key: str, timeout: int = 60) -> dict:
    img = _read_bytes(image_path)
    mime = _guess_mime(image_path)
    b64 = base64.b64encode(img).decode("ascii")

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": PROMPT},
                    {"inline_data": {"mime_type": mime, "data": b64}},
                ],
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 512,
            "responseMimeType": "application/json",
        },
    }

    # Try requested model first, then fall back to common Flash model ids.
    model_candidates = [
        model,
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
    ]

    last_err: Exception | None = None
    raw = ""
    for mname in model_candidates:
        url = API_URL_TMPL.format(model=mname, key=api_key)
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read().decode("utf-8")
            break
        except urllib.error.HTTPError as e:
            # 404 commonly means the model name isn't available for this key.
            last_err = e
            if e.code in (404,):
                continue
            raise
        except Exception as e:
            last_err = e
            continue

    if not raw:
        raise RuntimeError(f"Gemini request failed for all candidate models: {last_err}")

    data = json.loads(raw)
    # v1beta returns candidates[0].content.parts[0].text
    try:
        text = data["candidates"][0]["content"]["parts"][0].get("text", "")
    except Exception:
        text = ""

    if not text:
        # sometimes JSON is already structured elsewhere; just return the full response
        return {"items": [], "notes": "No text in response", "raw": data}

    # Try parse strict JSON first
    try:
        return json.loads(text)
    except Exception:
        # Best-effort: extract JSON object substring
        m = re.search(r"\{.*\}", text, flags=re.S)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                pass
        return {"items": _lines_to_items(text), "notes": "Non-JSON response", "raw_text": text}


def _lines_to_items(text: str) -> list[str]:
    # Split on newlines/bullets; discard empties
    lines = []
    for ln in re.split(r"\r?\n", text):
        ln = re.sub(r"^\s*[-•*\d.)]+\s*", "", ln).strip()
        if not ln:
            continue
        lines.append(ln)
    return lines


# Canonicalization rules for overlap detection.
# Keep this intentionally small + high-confidence.
_SYNONYM_SUBS: list[tuple[str, str]] = [
    # breadcrumbs variants
    (r"\bfresh bread ?crumbs?\b", "breadcrumbs"),
    (r"\bbread ?crumbs?\b", "breadcrumbs"),
    (r"\bbreadcrumbs\b", "breadcrumbs"),
    (r"\bpanko\b", "breadcrumbs"),
    # herbs
    (r"\bcoriander\b", "cilantro"),
    (r"\bcilantro\b", "cilantro"),
    # dairy: be conservative; only normalize greek yogurt -> yogurt
    (r"\bgreek yogurt\b", "yogurt"),
]


def _norm_name(s: str) -> str:
    """Heuristic normalizer to detect overlaps.

    Goal: map related items to the same key so we can avoid duplicates.
    """
    s = s.strip().lower()
    s = re.sub(r"\([^)]*\)", "", s)  # remove parentheticals
    s = re.sub(r"\b\d+\s*(?:-\s*\d+)?\b", " ", s)  # remove simple numbers / ranges
    s = re.sub(r"\b\d+\/\d+\b", " ", s)  # remove fractions like 3/4
    s = re.sub(
        r"\b(?:cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|oz|ounce|ounces|lb|lbs|pound|pounds|clove|cloves|can|cans)\b",
        " ",
        s,
    )
    s = re.sub(r"\s+", " ", s).strip(" -–—,")

    for pat, repl in _SYNONYM_SUBS:
        s = re.sub(pat, repl, s)

    s = re.sub(r"\s+", " ", s).strip(" -–—,")
    return s


def _get_existing_project_tasks(project: str) -> list[dict]:
    cp = subprocess.run(
        ["todoist", "tasks", "--all", "-p", project, "--json"],
        capture_output=True,
        text=True,
    )
    if cp.returncode != 0:
        raise RuntimeError(cp.stderr.strip() or cp.stdout.strip() or "todoist tasks failed")
    return json.loads(cp.stdout)


def _parse_fraction(num: str) -> Fraction | None:
    num = num.strip()
    if not num:
        return None
    # reject ranges like 1-2 or 12–16
    if re.search(r"\d\s*[-–]\s*\d", num):
        return None
    if "/" in num:
        try:
            a, b = num.split("/", 1)
            return Fraction(int(a), int(b))
        except Exception:
            return None
    try:
        # allow decimals
        return Fraction(str(float(num)))
    except Exception:
        return None


def _extract_qty_unit(text: str) -> tuple[Fraction | None, str | None]:
    """Best-effort quantity+unit extraction from a shopping item string.

    Supports patterns like:
      - "2 tbsp olive oil"
      - "Olive oil (2 tbsp)"
      - "Garlic (4 cloves)"
    Rejects ranges like "1-2" / "12–16".
    """
    t = text.lower()

    # Look inside first parentheses first
    m = re.search(r"\(([^)]{1,50})\)", t)
    cand = m.group(1) if m else t

    m2 = re.search(
        r"\b(?P<num>\d+(?:\.\d+)?|\d+\/\d+)\s*(?P<unit>cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lb|lbs|pounds?|cloves?|cans?)\b",
        cand,
    )
    if not m2:
        return None, None

    qty = _parse_fraction(m2.group("num"))
    if qty is None:
        return None, None

    unit = m2.group("unit")
    # normalize plurals
    unit = {
        "tablespoon": "tbsp",
        "tablespoons": "tbsp",
        "teaspoon": "tsp",
        "teaspoons": "tsp",
        "ounce": "oz",
        "ounces": "oz",
        "pound": "lb",
        "pounds": "lb",
        "lbs": "lb",
        "cup": "cup",
        "cups": "cup",
        "clove": "clove",
        "cloves": "clove",
        "can": "can",
        "cans": "can",
        "tbsp": "tbsp",
        "tsp": "tsp",
        "oz": "oz",
        "lb": "lb",
    }.get(unit, unit)

    return qty, unit


def _fraction_to_str(q: Fraction) -> str:
    # Prefer nice fractions when possible
    if q.denominator == 1:
        return str(q.numerator)
    return f"{q.numerator}/{q.denominator}"


def _slugify(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"^-+|-+$", "", s)
    return s or "recipe"


def save_recipe_to_workspace(
    *,
    title: str,
    source: str,
    items: list[str],
    notes: str = "",
    recipes_dir: str = "recipes",
) -> str:
    """Create a markdown recipe entry and add it to recipes/index.md."""
    d = date.today().isoformat()
    t = title.strip() or "Recipe"
    slug = _slugify(t)
    out_dir = Path(recipes_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    path = out_dir / f"{d}--{slug}.md"
    # avoid overwrite
    if path.exists():
        path = out_dir / f"{d}--{slug}-{os.getpid()}.md"

    ing = "\n".join([f"- {x}" for x in items])
    md = (
        f"# {t}\n\n"
        f"- Date cooked: {d}\n"
        f"- Source: {source}\n\n"
        f"## Ingredients\n\n{ing}\n\n"
    )
    if notes.strip():
        md += f"## Notes\n\n{notes.strip()}\n"

    path.write_text(md, encoding="utf-8")

    # update index
    idx = out_dir / "index.md"
    if not idx.exists():
        idx.write_text(
            "# Cookbook Index\n\n| Date cooked | Recipe | Tags | Rating | Source |\n|---|---|---|---:|---|\n",
            encoding="utf-8",
        )

    rel = path.as_posix()
    row = f"| {d} | [{t}]({rel}) |  |  | {source} |\n"
    with idx.open("a", encoding="utf-8") as f:
        f.write(row)

    return str(path)


def _rewrite_with_total(original: str, total: Fraction, unit: str) -> str:
    """Rewrite task content to include the new total quantity.

    Conservative: keep the original name text, replace/append a single "(X unit)".
    """
    base = original.strip()
    # Remove any existing (...) to avoid stacking
    base = re.sub(r"\s*\([^)]*\)\s*", " ", base).strip()
    return f"{base} ({_fraction_to_str(total)} {unit})"


def add_items_to_todoist(
    items: list[str],
    project: str,
    prefix: str = "",
    dry_run: bool = False,
    skip_overlap: bool = True,
    skip_pantry: bool = True,
    sum_quantities: bool = True,
) -> list[str]:
    """Update Todoist Shopping list.

    Default behavior:
      - skip pantry staples (salt/pepper)
      - detect overlaps using normalization + synonym mapping
      - if overlap AND both sides have parseable (qty, unit), update existing task to summed total
      - otherwise, skip adding duplicates
    """

    ids: list[str] = []

    existing_tasks = _get_existing_project_tasks(project) if (skip_overlap and not dry_run) else []
    existing_by_norm: dict[str, dict] = {}
    for t in existing_tasks:
        content = (t.get("content") or "").strip()
        if not content:
            continue
        nk = _norm_name(content)
        if not nk:
            continue

        if nk not in existing_by_norm:
            existing_by_norm[nk] = t
            continue

        # Prefer an existing task that already has a parseable qty+unit.
        cur = existing_by_norm[nk]
        cur_qty, cur_unit = _extract_qty_unit((cur.get("content") or "").strip())
        new_qty, new_unit = _extract_qty_unit(content)
        if (cur_qty is None or not cur_unit) and (new_qty is not None and new_unit):
            existing_by_norm[nk] = t

    pantry = {"salt", "kosher salt", "pepper", "black pepper", "freshly ground black pepper"}

    seen_new: set[str] = set()

    for item in items:
        title = f"{prefix}{item}".strip()
        if not title:
            continue

        norm = _norm_name(title)
        if not norm:
            continue

        if skip_pantry and norm in pantry:
            continue

        # dedupe within this run
        if norm in seen_new:
            continue
        seen_new.add(norm)

        existing_task = existing_by_norm.get(norm) if skip_overlap else None

        if dry_run:
            # In dry-run, we just show what we'd consider as candidate adds/updates.
            # (We still print even if it overlaps, because user may want to see it.)
            print(title)
            continue

        if existing_task and sum_quantities:
            ex_content = (existing_task.get("content") or "").strip()
            ex_id = existing_task.get("id")
            if ex_id:
                ex_qty, ex_unit = _extract_qty_unit(ex_content)
                new_qty, new_unit = _extract_qty_unit(title)
                # If existing has no qty but new does, set existing to new qty.
                if (ex_qty is None or not ex_unit) and (new_qty is not None and new_unit):
                    new_content = _rewrite_with_total(ex_content, new_qty, new_unit)
                    cp = subprocess.run(
                        ["todoist", "update", str(ex_id), "--content", new_content, "--json"],
                        capture_output=True,
                        text=True,
                    )
                    if cp.returncode != 0:
                        raise RuntimeError(cp.stderr.strip() or cp.stdout.strip() or "todoist update failed")
                    obj = json.loads(cp.stdout)
                    ids.append(obj.get("id", ""))
                    continue

                if ex_qty is not None and new_qty is not None and ex_unit and new_unit and ex_unit == new_unit:
                    total = ex_qty + new_qty
                    new_content = _rewrite_with_total(ex_content, total, ex_unit)
                    cp = subprocess.run(
                        ["todoist", "update", str(ex_id), "--content", new_content, "--json"],
                        capture_output=True,
                        text=True,
                    )
                    if cp.returncode != 0:
                        raise RuntimeError(cp.stderr.strip() or cp.stdout.strip() or "todoist update failed")
                    obj = json.loads(cp.stdout)
                    ids.append(obj.get("id", ""))
                    continue

            # If we can’t safely sum, treat as overlap and skip adding.
            continue

        if existing_task and skip_overlap:
            continue

        cp = subprocess.run(
            ["todoist", "add", title, "--project", project, "--json"],
            capture_output=True,
            text=True,
        )
        if cp.returncode != 0:
            raise RuntimeError(cp.stderr.strip() or cp.stdout.strip() or "todoist add failed")
        obj = json.loads(cp.stdout)
        ids.append(obj.get("id", ""))

    return ids


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--image", required=True, help="Path to recipe/cookbook photo")
    ap.add_argument("--project", default="Shopping", help="Todoist project name (default: Shopping)")
    ap.add_argument("--model", default="gemini-2.0-flash", help="Gemini model (Flash recommended)")
    ap.add_argument("--prefix", default="", help="Prefix for created tasks")
    ap.add_argument("--title", default="", help="Recipe title override (used for cookbook saving)")
    ap.add_argument("--source", default="", help="Recipe source URL/text override (used for cookbook saving)")
    ap.add_argument("--no-save", action="store_true", help="Do not save to workspace cookbook")
    ap.add_argument("--dry-run", action="store_true", help="Print extracted items; do not create tasks")
    ap.add_argument("--no-overlap-check", action="store_true", help="Do not check current Shopping list for overlaps")
    ap.add_argument("--include-pantry", action="store_true", help="Include pantry staples (e.g., salt/pepper)")
    ap.add_argument("--no-sum", action="store_true", help="Do not sum quantities on overlap; just skip duplicates")
    ap.add_argument("--timeout", type=int, default=60, help="Gemini request timeout (seconds)")
    args = ap.parse_args()

    if not os.path.exists(args.image):
        _die(f"Image not found: {args.image}")

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        _die("Missing GEMINI_API_KEY (or GOOGLE_API_KEY) in environment")

    # Ensure todoist token present when not dry-run
    if not args.dry_run and not os.environ.get("TODOIST_API_TOKEN"):
        _die("Missing TODOIST_API_TOKEN in environment")

    extracted = gemini_extract_items(args.image, args.model, api_key, timeout=args.timeout)

    # Backward/robust parsing: accept either {title, items, notes} or a raw list of strings.
    if isinstance(extracted, list):
        # Sometimes the model returns a JSON array with a single object.
        if extracted and isinstance(extracted[0], dict):
            obj = extracted[0]
            items = obj.get("items") or []
            title = (args.title or obj.get("title") or "").strip()
            notes = (obj.get("notes") or "").strip()
        else:
            items = extracted
            title = (args.title or "").strip()
            notes = ""
    else:
        items = extracted.get("items") or []
        title = (args.title or extracted.get("title") or "").strip()
        notes = (extracted.get("notes") or "").strip()

    source = (args.source or f"photo:{args.image}").strip()
    if not isinstance(items, list):
        _die(f"Gemini returned unexpected items type: {type(items)}")

    # Normalize strings
    norm: list[str] = []
    for it in items:
        if not isinstance(it, str):
            continue
        s = re.sub(r"\s+", " ", it).strip()
        if s:
            norm.append(s)

    if not norm:
        _die("No items extracted. Try a clearer crop of the ingredients list.", code=1)

    ids = add_items_to_todoist(
        norm,
        args.project,
        prefix=args.prefix,
        dry_run=args.dry_run,
        skip_overlap=not args.no_overlap_check,
        skip_pantry=not args.include_pantry,
        sum_quantities=not args.no_sum,
    )

    saved_path = ""
    if not args.no_save:
        repo_root = Path(__file__).resolve().parents[3]  # .../clawd
        saved_path = save_recipe_to_workspace(
            title=title,
            source=source,
            items=norm,
            notes=notes,
            recipes_dir=str(repo_root / "recipes"),
        )

    # Report the original extracted list; additions may be filtered for overlap/pantry.
    out = {
        "created": len(ids) if not args.dry_run else 0,
        "project": args.project,
        "title": title,
        "source": source,
        "items": norm,
        "task_ids": ids,
        "saved_recipe": saved_path,
        "note": "salt/pepper are skipped by default; overlap check runs unless --no-overlap-check",
    }
    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
