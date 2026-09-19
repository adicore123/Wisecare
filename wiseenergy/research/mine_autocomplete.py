from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SEEDS_PATH = ROOT / "seeds.txt"
OUTPUT_PATH = ROOT / "autocomplete.json"
ALPHABET = list("אבגדהוזחטיכלמנסעפצקרשת")
HEADS = [
    "סוללה לאופניים חשמליים",
    "סוללה לקורקינט חשמלי",
    "סוללה לטרקטורון חשמלי",
    "סוללת ליתיום לאופניים חשמליים",
    "סוללת ליתיום לקורקינט חשמלי",
    "תיקון סוללה לאופניים חשמליים",
    "תיקון סוללה לקורקינט חשמלי",
    "מטען לסוללת ליתיום",
]


def fetch_suggestions(query: str) -> list[str]:
    params = urllib.parse.urlencode({"client": "firefox", "hl": "iw", "q": query})
    request = urllib.request.Request(
        f"https://suggestqueries.google.com/complete/search?{params}",
        headers={"User-Agent": "Mozilla/5.0 WiseEnergy keyword research"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        raw = response.read()

    for encoding in ("utf-8", "cp1255"):
        try:
            payload = json.loads(raw.decode(encoding))
            return payload[1]
        except (UnicodeDecodeError, json.JSONDecodeError):
            continue
    raise ValueError(f"Could not decode Google Suggest response for: {query}")


def main() -> None:
    seeds = [line.strip() for line in SEEDS_PATH.read_text(encoding="utf-8").splitlines() if line.strip()]
    queries = list(dict.fromkeys(seeds + [f"{head} {letter}" for head in HEADS for letter in ALPHABET]))
    results: list[dict[str, object]] = []
    failures: list[dict[str, str]] = []

    for index, query in enumerate(queries, start=1):
        try:
            suggestions = fetch_suggestions(query)
            results.append({"query": query, "suggestions": suggestions})
        except Exception as exc:  # Keep partial research usable if one request fails.
            failures.append({"query": query, "error": str(exc)})
        if index < len(queries):
            time.sleep(0.12)

    unique_suggestions = sorted(
        {suggestion.strip() for item in results for suggestion in item["suggestions"] if suggestion.strip()}
    )
    OUTPUT_PATH.write_text(
        json.dumps(
            {
                "source": "Google Suggest",
                "locale": "iw",
                "query_count": len(queries),
                "successful_queries": len(results),
                "unique_suggestion_count": len(unique_suggestions),
                "unique_suggestions": unique_suggestions,
                "results": results,
                "failures": failures,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
