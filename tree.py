import sys
import argparse
from pathlib import Path
import pathspec

# Argument parser for input arguments
parser = argparse.ArgumentParser(description="Script so useful.")
parser.add_argument("--path", type=str, default=".")
parser.add_argument("--exclude", type=str, default="")

args = parser.parse_args()


class DisplayablePath(object):
    display_filename_prefix_middle = "├──"
    display_filename_prefix_last = "└──"
    display_parent_prefix_middle = "    "
    display_parent_prefix_last = "│   "

    def __init__(self, path, parent_path, is_last):
        self.path = Path(str(path))
        self.parent = parent_path
        self.is_last = is_last
        if self.parent:
            self.depth = self.parent.depth + 1
        else:
            self.depth = 0

    @property
    def displayname(self):
        if self.path.is_dir():
            return self.path.name + "/"
        return self.path.name

    @classmethod
    def make_tree(cls, root, parent=None, is_last=False, criteria=None):
        root = Path(str(root))
        criteria = criteria or cls._default_criteria

        displayable_root = cls(root, parent, is_last)
        yield displayable_root

        children = sorted(
            list(path for path in root.iterdir() if criteria(path)),
            key=lambda s: str(s).lower(),
        )
        count = 1
        for path in children:
            is_last = count == len(children)
            if path.is_dir():
                yield from cls.make_tree(
                    path, parent=displayable_root, is_last=is_last, criteria=criteria
                )
            else:
                yield cls(path, displayable_root, is_last)
            count += 1

    @classmethod
    def _default_criteria(cls, path):
        return True

    def displayable(self):
        if self.parent is None:
            return self.displayname

        _filename_prefix = (
            self.display_filename_prefix_last
            if self.is_last
            else self.display_filename_prefix_middle
        )

        parts = ["{!s} {!s}".format(_filename_prefix, self.displayname)]

        parent = self.parent
        while parent and parent.parent is not None:
            parts.append(
                self.display_parent_prefix_middle
                if parent.is_last
                else self.display_parent_prefix_last
            )
            parent = parent.parent

        return "".join(reversed(parts))


def get_gitignore_patterns():
    gitignore_path = Path(".gitignore")  # Path to your .gitignore file
    gitignore_patterns = []
    if gitignore_path.is_file():
        with gitignore_path.open() as f:
            gitignore_patterns = f.read().splitlines()
    return gitignore_patterns


def build_pathspec():
    patterns = get_gitignore_patterns()
    # Add patterns from --exclude argument if provided
    if args.exclude:
        patterns += args.exclude.replace(" ", "").split(",")
    return pathspec.PathSpec.from_lines("gitwildmatch", patterns)


# Build the pathspec based on .gitignore and exclude argument
gitignore_spec = build_pathspec()


def criteria(path):
    # Check if the path is excluded by .gitignore patterns
    return not gitignore_spec.match_file(str(path))


# Display the directory tree
paths = DisplayablePath.make_tree(Path(args.path), criteria=criteria)
for path in paths:
    print(path.displayable())
