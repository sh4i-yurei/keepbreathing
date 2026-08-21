#!/usr/bin/env python3
"""Structural checks the HTML validator does not perform.

The Nu validator checks the markup against the HTML spec. It does not know
whether an image path points at a file that exists, which is the easiest
mistake to make when hand-coding a blog post into blog.html and the hardest
to see by skimming.

Exits non-zero if anything fails, so it works as a CI gate.
"""

import os
import re
import sys
from html.parser import HTMLParser

SITE = "site"
VOID = {"img", "br", "hr", "meta", "link", "input", "source",
        "area", "base", "col", "embed", "param", "track", "wbr"}


class TagBalance(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        if tag not in VOID:
            self.stack.append((tag, self.getpos()[0]))

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack:
            self.errors.append("line %d: stray </%s>" % (self.getpos()[0], tag))
        elif self.stack[-1][0] != tag:
            self.errors.append(
                "line %d: </%s> closes <%s> opened at line %d"
                % (self.getpos()[0], tag, self.stack[-1][0], self.stack[-1][1]))
        else:
            self.stack.pop()


def check(path):
    """Return a list of problems found in one page."""
    problems = []
    src = open(path, encoding="utf-8").read()

    parser = TagBalance()
    parser.feed(src)
    problems += parser.errors
    problems += ["unclosed <%s> opened at line %d" % (t, l) for t, l in parser.stack]

    for src_attr in re.findall(r'<img[^>]+src="([^"]+)"', src):
        if src_attr.startswith(("http://", "https://", "data:", "//")):
            continue
        target = os.path.join(SITE, src_attr.lstrip("/"))
        if not os.path.exists(target):
            problems.append("image not found: %s" % src_attr)

    for tag in re.findall(r"<img[^>]*>", src):
        missing = [a for a in ("alt=", "width=", "height=") if a not in tag]
        if missing:
            problems.append("img missing %s: %s" % (", ".join(missing), tag[:70]))

    ids = re.findall(r'\bid="([^"]+)"', src)
    for dupe in sorted({i for i in ids if ids.count(i) > 1}):
        problems.append("duplicate id: %s" % dupe)

    return problems


def main():
    pages = sorted(p for p in os.listdir(SITE) if p.endswith(".html"))
    if not pages:
        print("no pages found in %s/" % SITE)
        return 1

    failed = False
    for page in pages:
        problems = check(os.path.join(SITE, page))
        if problems:
            failed = True
            print("FAIL %s" % page)
            for p in problems:
                print("     %s" % p)
        else:
            print("ok   %s" % page)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
