"""List every public canonical HTML page in a Google-supported text sitemap."""
import argparse
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote
from urllib.robotparser import RobotFileParser


class PageHead(HTMLParser):
    def __init__(self):
        super().__init__()
        self.head = False
        self.canonicals = []
        self.noindex = False
        self.redirect = False

    def handle_starttag(self, tag, attributes):
        values = dict(attributes)
        if tag == 'head':
            self.head = True
        if tag == 'link' and 'canonical' in values.get('rel', '').lower().split():
            self.canonicals.append(values.get('href', ''))
        if tag == 'meta':
            if values.get('name', '').lower() in ('robots', 'googlebot'):
                rules = values.get('content', '').lower().replace(',', ' ').split()
                self.noindex |= bool(set(rules) & {'noindex', 'none'})
            self.redirect |= values.get('http-equiv', '').lower() == 'refresh'


def public_urls(site, base_url):
    urls = []
    robots = RobotFileParser()
    robots.parse((site / 'robots.txt').read_text().splitlines())
    for file in sorted(site.rglob('*.html')):
        path = file.relative_to(site)
        if path.parts[0] in ('assets', 'scripts', 'node_modules') or file.name == '404.html':
            continue
        if any(part.startswith(('.', '_')) for part in path.parts):
            continue
        head = PageHead()
        head.feed(file.read_text(encoding='utf-8'))
        if not head.head or head.noindex or head.redirect:
            continue
        route = '/' + path.as_posix()
        if route.endswith('/index.html'):
            route = route[:-len('index.html')]
        url = base_url.rstrip('/') + quote(route, safe='/')
        if len(head.canonicals) != 1:
            raise ValueError(f'{path}: expected one canonical URL, found {head.canonicals}')
        if head.canonicals[0] != url:
            raise ValueError(f'{path}: canonical {head.canonicals[0]} does not match {url}')
        if not robots.can_fetch('Googlebot', url):
            raise ValueError(f'{path}: robots.txt blocks Googlebot')
        urls.append(url)
    if not urls:
        raise ValueError('No public canonical pages found')
    return sorted(set(urls))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site', type=Path, required=True)
    parser.add_argument('--url', required=True)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    content = '\n'.join(public_urls(args.site, args.url)) + '\n'
    output = args.site / 'sitemap-pages.txt'
    if args.check:
        if not output.exists() or output.read_text(encoding='utf-8') != content:
            raise SystemExit('Public-page sitemap is missing or incomplete')
    else:
        output.write_text(content, encoding='utf-8')
    print(f'Public-page sitemap: {len(content.splitlines())} canonical HTML URLs; coverage verified.')


if __name__ == '__main__':
    main()
