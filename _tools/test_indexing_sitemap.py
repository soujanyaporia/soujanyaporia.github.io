import tempfile
import unittest
from pathlib import Path
from build_indexing_sitemap import public_urls


class IndexingCoverage(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.site = Path(self.temporary.name)
        (self.site / 'robots.txt').write_text('User-agent: *\nDisallow:\n')

    def page(self, name, canonical='', extra=''):
        path = self.site / name
        path.parent.mkdir(parents=True, exist_ok=True)
        link = f'<link rel="canonical" href="{canonical}">' if canonical else ''
        path.write_text(f'<!doctype html><html><head>{link}{extra}</head><body>Page</body></html>')

    def test_all_public_pages_including_separately_built_apps(self):
        for path, url in [('index.html', '/'), ('lab-notes/example/index.html', '/lab-notes/example/'), ('math-for-primary/index.html', '/math-for-primary/'), ('RoboQuest/tasks.html', '/RoboQuest/tasks.html')]:
            self.page(path, 'https://example.com' + url)
        self.assertEqual(len(public_urls(self.site, 'https://example.com')), 4)

    def test_excludes_error_pages_assets_verification_and_explicit_exclusions(self):
        self.page('index.html', 'https://example.com/')
        self.page('404.html')
        self.page('assets/license.html')
        self.page('private/index.html', extra='<meta name="robots" content="noindex,follow">')
        self.page('old.html', extra='<meta http-equiv="refresh" content="0;url=/">')
        (self.site / 'googleverification.html').write_text('google-site-verification: token')
        self.assertEqual(public_urls(self.site, 'https://example.com'), ['https://example.com/'])

    def test_missing_or_wrong_canonical_fails_coverage_check(self):
        for canonical in ['', 'https://example.com/wrong/']:
            self.page('index.html', canonical)
            with self.assertRaises(ValueError):
                public_urls(self.site, 'https://example.com')

    def test_robots_block_is_detected(self):
        self.page('index.html', 'https://example.com/')
        (self.site / 'robots.txt').write_text('User-agent: *\nDisallow: /\n')
        with self.assertRaises(ValueError):
            public_urls(self.site, 'https://example.com')


if __name__ == '__main__':
    unittest.main()
