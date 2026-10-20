from pathlib import Path
import sys, zipfile
root = Path(__file__).resolve().parents[1]
output = Path(sys.argv[1]).resolve()
folders = {'app', 'components', 'lib', 'netlify', 'netlify-dist', 'tests', 'cloudflare', 'migration', '.github'}
files = {'package.json', 'package-lock.json', 'README.md', 'CLOUDFLARE-MIGRATION.md', 'GITHUB-CLOUDFLARE.md', 'WINDOWS-MIGRATION.md', 'START-MIGRATION-WINDOWS.cmd', 'netlify.toml', 'vite.netlify.config.mjs', 'wrangler.jsonc', '.gitignore'}
blocked = {'node_modules', '.netlify', '.wrangler', '.migration-private', 'cloudflare-build', '__pycache__'}
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob('*')):
        relative = path.relative_to(root)
        if not path.is_file() or any(part in blocked for part in relative.parts):
            continue
        if len(relative.parts) == 1 and relative.name not in files:
            continue
        if len(relative.parts) > 1 and relative.parts[0] not in folders:
            continue
        if path.name.startswith(('.env', '.dev.vars', '.private')) or path.suffix == '.jsonl' or path.name in {'qa.html', 'qa-runtime.js', 'visual-checks.html'}:
            continue
        archive.write(path, Path('GoalForge') / relative)
print(f'{output.name}: {output.stat().st_size} bytes; private migration records excluded')
