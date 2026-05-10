import json
import os
import re
import sys
import time
from difflib import SequenceMatcher
from urllib.parse import quote_plus

import requests
import yaml

ROOT = "/Users/poriasoujanya/Downloads/soujanyaporia.github.io-master"
YAML_PATH = os.path.join(ROOT, "_data", "publications.yml")
SCHOLAR_CACHE_PATH = os.path.join(ROOT, "_scripts", "scholar_link_cache.json")
S2_CACHE_PATH = os.path.join(ROOT, "_scripts", "semantic_scholar_link_cache.json")
CROSSREF_CACHE_PATH = os.path.join(ROOT, "_scripts", "crossref_link_cache.json")
S2_URL = "https://api.semanticscholar.org/graph/v1/paper/search"
CROSSREF_URL = "https://api.crossref.org/works"


def normalize_title(title):
    return re.sub(r"[^a-z0-9]+", " ", title.lower()).strip()


def load_json(path):
    if not os.path.exists(path):
        return {}
    with open(path, "r") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2, sort_keys=True)


def scholar_url(title):
    return "https://scholar.google.com/scholar?q=" + quote_plus(title)


def arxiv_from_venue(venue):
    match = re.search(r"arXiv:([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?)", venue or "")
    if not match:
        return None
    return match.group(1)


def semantic_scholar_lookup(title, retries=4):
    for attempt in range(retries):
        response = requests.get(
            S2_URL,
            params={
                "query": title,
                "limit": 1,
                "fields": "title,url,externalIds,openAccessPdf",
            },
            timeout=20,
        )
        if response.status_code == 429:
            wait = 20 * (attempt + 1)
            print(f"  Semantic Scholar rate-limited; waiting {wait}s", file=sys.stderr)
            time.sleep(wait)
            continue
        response.raise_for_status()
        data = response.json().get("data") or []
        if not data:
            return {}

        paper = data[0]
        external = paper.get("externalIds") or {}
        result = {}

        if external.get("ACL"):
            result["publication_url"] = f"https://aclanthology.org/{external['ACL']}"
        elif external.get("DOI"):
            result["publication_url"] = f"https://doi.org/{external['DOI']}"
        elif external.get("ArXiv"):
            result["publication_url"] = f"https://arxiv.org/abs/{external['ArXiv']}"
        elif paper.get("url"):
            result["publication_url"] = paper["url"]

        pdf = paper.get("openAccessPdf") or {}
        if pdf.get("url"):
            result["pdf"] = pdf["url"]

        return result

    return {}


def acl_from_doi(doi):
    prefix = "10.18653/v1/"
    if not doi or not doi.lower().startswith(prefix):
        return None
    acl_id = doi[len(prefix) :]
    return {
        "publication_url": f"https://aclanthology.org/{acl_id}",
        "pdf": f"https://aclanthology.org/{acl_id}.pdf",
    }


def crossref_lookup(title):
    response = requests.get(
        CROSSREF_URL,
        params={"query.title": title, "rows": 1},
        headers={
            "User-Agent": (
                "soujanyaporia.github.io publication link enrichment "
                "(mailto:soujanya.poria@ntu.edu.sg)"
            )
        },
        timeout=20,
    )
    response.raise_for_status()
    items = response.json().get("message", {}).get("items") or []
    if not items:
        return {}

    item = items[0]
    candidate_title = " ".join(item.get("title") or [])
    score = SequenceMatcher(None, normalize_title(title), normalize_title(candidate_title)).ratio()
    if score < 0.82:
        return {}

    doi = item.get("DOI")
    acl = acl_from_doi(doi)
    if acl:
        return acl

    if doi:
        return {"publication_url": f"https://doi.org/{doi}"}

    if item.get("URL"):
        return {"publication_url": item["URL"]}

    return {}


def write_yaml(publications):
    with open(YAML_PATH, "w") as f:
        f.write("# Publications data file - easy to maintain\n")
        f.write("# Fields: title, authors, venue, year\n")
        f.write("# Optional: publication_url, scholar_url, pdf, abstract, code, project\n\n")
        f.write(
            yaml.safe_dump(
                publications,
                sort_keys=False,
                width=1000,
                allow_unicode=True,
                default_flow_style=False,
            )
        )


with open(YAML_PATH, "r") as f:
    publications = yaml.safe_load(f)

scholar_cache = load_json(SCHOLAR_CACHE_PATH)
s2_cache = load_json(S2_CACHE_PATH)
crossref_cache = load_json(CROSSREF_CACHE_PATH)

for index, pub in enumerate(publications, 1):
    title = pub["title"]
    key = normalize_title(title)
    pub["scholar_url"] = scholar_url(title)

    cached = scholar_cache.get(key) or {}
    if cached.get("publication_url"):
        pub["publication_url"] = cached["publication_url"]
    if cached.get("pdf"):
        pub["pdf"] = cached["pdf"]

    arxiv_id = arxiv_from_venue(pub.get("venue"))
    if arxiv_id and not pub.get("publication_url"):
        pub["publication_url"] = f"https://arxiv.org/abs/{arxiv_id}"
    if arxiv_id and not pub.get("pdf"):
        pub["pdf"] = f"https://arxiv.org/pdf/{arxiv_id}"

    if not pub.get("publication_url"):
        if key not in crossref_cache:
            print(f"[{index}/{len(publications)}] Crossref: {title[:80]}...", file=sys.stderr)
            crossref_cache[key] = crossref_lookup(title)
            save_json(CROSSREF_CACHE_PATH, crossref_cache)
            time.sleep(0.25)

        fallback = crossref_cache.get(key) or {}
        if fallback.get("publication_url"):
            pub["publication_url"] = fallback["publication_url"]
        if fallback.get("pdf") and not pub.get("pdf"):
            pub["pdf"] = fallback["pdf"]

    if not pub.get("publication_url"):
        fallback = s2_cache.get(key) or {}
        if fallback.get("publication_url"):
            pub["publication_url"] = fallback["publication_url"]
        if fallback.get("pdf") and not pub.get("pdf"):
            pub["pdf"] = fallback["pdf"]

    if not pub.get("publication_url"):
        pub["publication_url"] = "https://www.google.com/search?q=" + quote_plus('"' + title + '"')

write_yaml(publications)

with_publication = sum(1 for pub in publications if pub.get("publication_url"))
with_pdf = sum(1 for pub in publications if pub.get("pdf"))
print(f"Publication URLs: {with_publication}/{len(publications)}", file=sys.stderr)
print(f"PDF URLs: {with_pdf}/{len(publications)}", file=sys.stderr)
