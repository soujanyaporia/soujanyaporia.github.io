import json
import os
import re
import sys
import time
from difflib import SequenceMatcher
from urllib.parse import urljoin

import requests
import yaml
from bs4 import BeautifulSoup

ROOT = "/Users/poriasoujanya/Downloads/soujanyaporia.github.io-master"
PUBLICATIONS_PATH = os.path.join(ROOT, "_data", "publications.yml")
OUT_PATH = os.path.join(ROOT, "_scripts", "google_scholar_audit.json")
BASE_URL = "https://scholar.google.co.in"
PROFILE_URL = (
    BASE_URL
    + "/citations?hl=en&user=oS6gRc4AAAAJ&view_op=list_works&sortby=pubdate"
)
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
}


def normalize_title(title):
    title = title.lower()
    title = title.replace("’", "'").replace("“", '"').replace("”", '"')
    title = re.sub(r"\b(arxiv|preprint|proceedings|findings)\b", " ", title)
    title = re.sub(r"[^a-z0-9]+", " ", title)
    title = re.sub(r"\s+", " ", title)
    return title.strip()


def fetch_profile_entries():
    entries = []
    seen_ids = set()
    for start in range(0, 400, 100):
        url = f"{PROFILE_URL}&cstart={start}&pagesize=100"
        print(f"Reading Google Scholar page cstart={start}", file=sys.stderr)
        response = requests.get(url, headers=HEADERS, timeout=20)
        response.raise_for_status()
        if "unusual traffic" in response.text.lower():
            raise RuntimeError("Google Scholar returned an unusual-traffic page.")
        soup = BeautifulSoup(response.text, "html.parser")
        rows = soup.select("tr.gsc_a_tr")
        if not rows:
            break
        for row in rows:
            title_link = row.select_one("a.gsc_a_at")
            if not title_link:
                continue
            href = title_link.get("href", "")
            citation_id = href.split("citation_for_view=")[-1].split("&")[0]
            if citation_id in seen_ids:
                continue
            seen_ids.add(citation_id)
            venue = row.select_one(".gs_gray:nth-of-type(2)")
            year = row.select_one(".gsc_a_y span")
            citations = row.select_one(".gsc_a_ac")
            entries.append(
                {
                    "title": title_link.get_text(" ", strip=True),
                    "normalized": normalize_title(title_link.get_text(" ", strip=True)),
                    "venue": venue.get_text(" ", strip=True) if venue else "",
                    "year": year.get_text(" ", strip=True) if year else "",
                    "citations": citations.get_text(" ", strip=True) if citations else "",
                    "scholar_citation_url": urljoin(BASE_URL, href),
                }
            )
        if len(rows) < 100:
            break
        time.sleep(1)
    return entries


def best_match(title_key, site_keys):
    best = ("", 0.0)
    for site_title, site_key in site_keys:
        score = SequenceMatcher(None, title_key, site_key).ratio()
        if score > best[1]:
            best = (site_title, score)
    return best


with open(PUBLICATIONS_PATH, "r") as f:
    site_publications = yaml.safe_load(f)

site_keys = [(pub["title"], normalize_title(pub["title"])) for pub in site_publications]
site_key_set = {key for _, key in site_keys}
scholar_entries = fetch_profile_entries()

exact = []
near = []
missing = []

for entry in scholar_entries:
    key = entry["normalized"]
    if key in site_key_set:
        exact.append(entry)
        continue
    title, score = best_match(key, site_keys)
    item = {**entry, "closest_site_title": title, "similarity": round(score, 3)}
    if score >= 0.88:
        near.append(item)
    else:
        missing.append(item)

report = {
    "site_count": len(site_publications),
    "scholar_count": len(scholar_entries),
    "exact_matches": len(exact),
    "near_duplicate_matches": len(near),
    "potentially_missing": missing,
    "near_duplicates": near,
}

with open(OUT_PATH, "w") as f:
    json.dump(report, f, indent=2, ensure_ascii=False)

print(json.dumps({k: v for k, v in report.items() if k not in ("potentially_missing", "near_duplicates")}, indent=2))
print(f"Potentially missing: {len(missing)}")
for item in missing:
    print(f"- {item['year']} | {item['title']} | {item['venue']} | closest={item['similarity']} {item['closest_site_title']}")
