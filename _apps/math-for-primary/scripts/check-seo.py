"""Audit the deployed HTML graph, not just the page generator's data structures."""
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1] / 'dist'
BASE = 'https://soujanyaporia.github.io/math-for-primary/'
BASE_PATH = urlsplit(BASE).path


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.head = False
        self.title = False
        self.title_text = ''
        self.description = []
        self.canonicals = []
        self.h1 = 0
        self.ids = set()
        self.links = []
        self.assets = []
        self.robots = ''
        self.ld = False
        self.ld_text = ''
        self.schemas = []
        self.inert_buttons = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'head': self.head = True
        if tag == 'title' and self.head: self.title = True
        if tag == 'h1': self.h1 += 1
        if tag == 'button': self.inert_buttons += 1
        if 'id' in a: self.ids.add(a['id'])
        if tag == 'a' and a.get('href'): self.links.append(a['href'])
        if tag == 'link' and a.get('rel') == 'canonical': self.canonicals.append(a.get('href'))
        if tag == 'link' and a.get('rel') in ('stylesheet', 'icon'): self.assets.append(a['href'])
        if tag == 'script' and a.get('src'): self.assets.append(a['src'])
        if tag == 'meta' and a.get('name') == 'description': self.description.append(a.get('content', ''))
        if tag == 'meta' and a.get('name') == 'robots': self.robots = a.get('content', '')
        if tag == 'script' and a.get('type') == 'application/ld+json':
            self.ld, self.ld_text = True, ''

    def handle_data(self, data):
        if self.title: self.title_text += data
        if self.ld: self.ld_text += data

    def handle_endtag(self, tag):
        if tag == 'head': self.head = False
        if tag == 'title': self.title = False
        if tag == 'script' and self.ld:
            self.schemas.append(json.loads(self.ld_text))
            self.ld = False


def check():
    pages = {}
    for file in ROOT.rglob('*.html'):
        rel = file.relative_to(ROOT).as_posix()
        url = BASE + rel.removesuffix('index.html')
        p = Page()
        p.feed(file.read_text())
        assert p.canonicals == [url], (rel, 'canonical', p.canonicals)
        assert p.title_text.strip(), (rel, 'missing title')
        assert len(p.description) == 1 and p.description[0], (rel, 'description')
        assert p.h1 == 1, (rel, 'expected one H1', p.h1)
        assert 'noindex' not in p.robots, (rel, 'noindex')
        assert p.schemas, (rel, 'missing structured data')
        assert not p.inert_buttons, (rel, 'nonfunctional static buttons')
        pages[url] = p
    assert len(pages) > 1, 'No public lessons were generated'
    assert len({p.title_text for p in pages.values()}) == len(pages), 'Duplicate page titles'
    sitemap = ET.parse(ROOT / 'sitemap.xml')
    urls = [element.text for element in sitemap.findall('.//{*}loc')]
    assert len(urls) == len(set(urls)), 'Duplicate sitemap URLs'
    assert set(urls) == set(pages), 'Sitemap differs from public HTML pages'
    graph = {url: set() for url in pages}
    for url, p in pages.items():
        for href in p.assets + p.links:
            target = urlsplit(urljoin(url, href))
            if target.netloc != urlsplit(BASE).netloc or not target.path.startswith(BASE_PATH): continue
            file = ROOT / unquote(target.path[len(BASE_PATH):])
            assert (file / 'index.html').is_file() if target.path.endswith('/') else file.is_file(), (url, 'broken link/asset', href)
            destination = target._replace(fragment='', query='').geturl()
            if destination in pages and href in p.links:
                graph[url].add(destination)
                if target.fragment and not target.fragment.startswith('/'):
                    assert unquote(target.fragment) in pages[destination].ids, (url, 'missing anchor', href)
        for schema in p.schemas:
            if schema.get('@type') == 'BreadcrumbList':
                for item in schema['itemListElement']:
                    assert item['item'] in pages, (url, 'broken breadcrumb', item)
            elif schema.get('url'):
                assert schema['url'] == url, (url, 'schema URL')
    visited, pending = set(), [BASE]
    while pending:
        url = pending.pop()
        if url in visited: continue
        visited.add(url)
        pending.extend(graph[url] - visited)
    assert visited == set(pages), ('Pages unreachable from home', set(pages) - visited)
    print(f'SEO audit: {len(pages)} pages; unique titles, descriptions, canonicals, schema, sitemap, local links/assets and homepage reachability verified.')


if __name__ == '__main__':
    check()
