#!/usr/bin/env python3
"""Convert hardcoded slate colors to theme-aware CSS variables across all page components."""
import os
import re
from pathlib import Path

# Replacements: (regex pattern, replacement)
# Order matters - more specific patterns first
REPLACEMENTS = [
    # Card / surface backgrounds
    (r'bg-slate-50(?!\d)', 'bg-background'),
    (r'bg-slate-100(?!\d)', 'bg-muted'),
    (r'bg-slate-200(?!\d)', 'bg-muted'),
    # Text
    (r'text-slate-900(?!\d)', 'text-foreground'),
    (r'text-slate-800(?!\d)', 'text-foreground'),
    (r'text-slate-700(?!\d)', 'text-foreground'),
    (r'text-slate-600(?!\d)', 'text-muted-foreground'),
    (r'text-slate-500(?!\d)', 'text-muted-foreground'),
    (r'text-slate-400(?!\d)', 'text-muted-foreground/70'),
    (r'text-slate-300(?!\d)', 'text-muted-foreground/50'),
    # Borders
    (r'border-slate-200(?!\d)', 'border-border'),
    (r'border-slate-100(?!\d)', 'border-border'),
    (r'border-slate-300(?!\d)', 'border-border'),
    # Hover backgrounds
    (r'hover:bg-slate-50(?!\d)', 'hover:bg-muted/50'),
    (r'hover:bg-slate-100(?!\d)', 'hover:bg-muted'),
    # Specific patterns that should NOT be replaced
    # bg-slate-900/40 is the mobile overlay - keep as is
]

def transform(content: str) -> str:
    for pattern, replacement in REPLACEMENTS:
        content = re.sub(pattern, replacement, content)
    return content

def main():
    base = Path('/home/z/my-project/src/components/pages')
    changed = []
    for f in base.glob('*.tsx'):
        original = f.read_text()
        # Skip the slate-900/40 overlay (it's intentional)
        # The patterns above already exclude -900 etc via lookahead
        transformed = transform(original)
        if transformed != original:
            f.write_text(transformed)
            changed.append(f.name)
    print(f'Updated {len(changed)} files:')
    for c in changed:
        print(f'  - {c}')

if __name__ == '__main__':
    main()
