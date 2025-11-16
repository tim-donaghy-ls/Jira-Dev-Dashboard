
"""Tech Stack Detector Skill

Responsibility:
- Inspect files such as .csproj, package.json, and Playwright configs
- Infer which test frameworks are in use.
"""

import json
import glob
from typing import Dict, Any

def detect_stack(root: str = ".") -> Dict[str, Any]:
    backend = {"framework": None}
    frontend = {"runner": None}
    e2e = {"framework": None, "language": "typescript"}

    # Detect backend test framework via csproj references
    for csproj in glob.glob(root + "/**/*.csproj", recursive=True):
        with open(csproj, encoding="utf-8") as f:
            text = f.read().lower()
        if "nunit.framework" in text:
            backend["framework"] = "nunit"
        elif "xunit" in text:
            backend["framework"] = "xunit"

    # Detect frontend runner via package.json
    for pkg in glob.glob(root + "/**/package.json", recursive=True):
        try:
            with open(pkg, encoding="utf-8") as f:
                data = json.load(f)
            deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
            if "jest" in deps:
                frontend["runner"] = "jest"
            elif "karma" in deps:
                frontend["runner"] = "karma"
        except Exception:
            continue

    # Detect playwright
    for pw_cfg in glob.glob(root + "/**/playwright.config.*", recursive=True):
        e2e["framework"] = "playwright"

    return {
        "backend": backend,
        "frontend": frontend,
        "e2e": e2e
    }
