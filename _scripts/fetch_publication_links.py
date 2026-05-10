import json
import os
import re
import sys
import time
from urllib.parse import quote_plus, urljoin

import requests
import yaml
from bs4 import BeautifulSoup

ROOT = "/Users/poriasoujanya/Downloads/soujanyaporia.github.io-master"
YAML_PATH = os.path.join(ROOT, "_data", "publications.yml")
CACHE_PATH = os.path.join(ROOT, "_scripts", "scholar_link_cache.json")
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
    return re.sub(r"[^a-z0-9]+", " ", title.lower()).strip()


def load_cache():
    if not os.path.exists(CACHE_PATH):
        return {}
    with open(CACHE_PATH, "r") as f:
        return json.load(f)


def save_cache(cache):
    with open(CACHE_PATH, "w") as f:
        json.dump(cache, f, indent=2, sort_keys=True)


def get(url):
    response = requests.get(url, headers=HEADERS, timeout=20)
    response.raise_for_status()
    if "unusual traffic" in response.text.lower():
        raise RuntimeError("Google Scholar returned an unusual-traffic page.")
    return response.text


def profile_entries():
    entries = []
    seen = set()

    for start in range(0, 300, 100):
        url = f"{PROFILE_URL}&cstart={start}&pagesize=100"
        print(f"Reading profile page cstart={start}", file=sys.stderr)
        soup = BeautifulSoup(get(url), "html.parser")
        links = soup.select("a.gsc_a_at")
        if not links:
            break

        for link in links:
            title = link.get_text(" ", strip=True)
            key = normalize_title(title)
            if key in seen:
                continue
            seen.add(key)
            entries.append(
                {
                    "title": title,
                    "key": key,
                    "citation_url": urljoin(BASE_URL, link.get("href")),
                }
            )

        if len(links) < 100:
            break
        time.sleep(1.5)

    return entries


def paper_links(citation_url):
    soup = BeautifulSoup(get(citation_url), "html.parser")
    title_link = soup.select_one("a.gsc_oci_title_link")
    result = {}

    if title_link and title_link.get("href"):
        result["publication_url"] = title_link["href"]

    for link in soup.select("a"):
        text = link.get_text(" ", strip=True).lower()
        href = link.get("href")
        if not href:
            continue
        if "[pdf]" in text or href.lower().endswith(".pdf") or "/pdf/" in href.lower():
            result["pdf"] = href
            break

    return result


def scholar_url(title):
    return "https://scholar.google.com/scholar?q=" + quote_plus(title)


def write_yaml(publications):
    with open(YAML_PATH, "w") as f:
        f.write("# Publications data file - easy to maintain\n")
        f.write("# Fields: title, authors, venue, year\n")
        f.write("# Optional: publication_url, scholar_url, pdf, abstract, code, project\n\n")
        for pub in publications:
            f.write(yaml.safe_dump([pub], sort_keys=False, width=1000, allow_unicode=True)[2:])
            f.write("\n")


with open(YAML_PATH, "r") as f:
    publications = yaml.safe_load(f)

cache = load_cache()
entries = profile_entries()
entry_by_key = {entry["key"]: entry for entry in entries}
print(f"Found {len(entries)} Google Scholar profile entries.", file=sys.stderr)

updated = 0
missing = []

for index, pub in enumerate(publications, 1):
    title = pub["title"]
    key = normalize_title(title)
    pub["scholar_url"] = scholar_url(title)

    entry = entry_by_key.get(key)
    if not entry:
        missing.append(title)
        continue

    if key not in cache:
        print(f"[{index}/{len(publications)}] {title[:80]}...", file=sys.stderr)
        cache[key] = paper_links(entry["citation_url"])
        save_cache(cache)
        time.sleep(1.2)

    links = cache.get(key) or {}
    if links.get("publication_url"):
        pub["publication_url"] = links["publication_url"]
        updated += 1
    if links.get("pdf"):
        pub["pdf"] = links["pdf"]

save_cache(cache)
write_yaml(publications)

print(f"Updated {updated}/{len(publications)} publications with proper URLs.", file=sys.stderr)
if missing:
    print(f"Missing {len(missing)} title matches:", file=sys.stderr)
    for title in missing[:20]:
        print(f"  - {title}", file=sys.stderr)
