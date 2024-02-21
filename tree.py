import sys
import argparse
from pathlib import Path


parser = argparse.ArgumentParser(description='Script so useful.')
parser.add_argument("--path", type=str, default='.')
parser.add_argument("--exclude", type=str, default='')

args = parser.parse_args()

class DisplayablePath(object):
    display_filename_prefix_middle = '├──'
    display_filename_prefix_last = '└──'
    display_parent_prefix_middle = '    '
    display_parent_prefix_last = '│   '

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
            return self.path.name + '/'
        return self.path.name

    @classmethod
    def make_tree(cls, root, parent=None, is_last=False, criteria=None):
        root = Path(str(root))
        criteria = criteria or cls._default_criteria

        displayable_root = cls(root, parent, is_last)
        yield displayable_root

        children = sorted(list(path
                               for path in root.iterdir()
                               if criteria(path)),
                          key=lambda s: str(s).lower())
        count = 1
        for path in children:
            is_last = count == len(children)
            if path.is_dir():
                yield from cls.make_tree(path,
                                         parent=displayable_root,
                                         is_last=is_last,
                                         criteria=criteria)
            else:
                yield cls(path, displayable_root, is_last)
            count += 1

    @classmethod
    def _default_criteria(cls, path):
        return True

    @property
    def displayname(self):
        if self.path.is_dir():
            return self.path.name + '/'
        return self.path.name

    def displayable(self):
        if self.parent is None:
            return self.displayname

        _filename_prefix = (self.display_filename_prefix_last
                            if self.is_last
                            else self.display_filename_prefix_middle)

        parts = ['{!s} {!s}'.format(_filename_prefix,
                                    self.displayname)]

        parent = self.parent
        while parent and parent.parent is not None:
            parts.append(self.display_parent_prefix_middle
                         if parent.is_last
                         else self.display_parent_prefix_last)
            parent = parent.parent

        return ''.join(reversed(parts))
    


# With a criteria (skip hidden files)
# def crieteria(path):
#     return not path.name.startswith(".") and not any(i in path.name for i in ['__pycache__', 'node_modules'])
    
def get_gitignore_patterns():
    gitignore_path = Path('.gitignore')  # Path to your .gitignore file
    gitignore_patterns = []
    if gitignore_path.is_file():
        with gitignore_path.open() as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):  # Ignore empty lines and comments
                    gitignore_patterns.append(line)
    return gitignore_patterns

def criteria(path):
    gitignore_patterns = get_gitignore_patterns() + args.exclude.replace(' ','').split(',') if args.exclude else []
    for pattern in gitignore_patterns:
        if pattern.startswith("/"):  # Match absolute paths from the root of the repository
            if path.match(pattern[1:]):
                return False
        elif pattern.endswith("/"):  # Match directories
            if path.is_dir() and path.match(pattern[:-1]):
                return False
        else:  # Match files
            if path.match(pattern):
                return False
    return not path.name.startswith(".")  
    
paths = DisplayablePath.make_tree(Path(args.path), criteria=criteria)
for path in paths:
    print(path.displayable())