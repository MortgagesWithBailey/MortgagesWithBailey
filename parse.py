import re

file_path = r"C:\Users\baile\.gemini\antigravity\brain\1aad619b-afac-49f4-911d-9e561d835369\.system_generated\steps\350\content.md"

with open(file_path, "r", encoding="utf-8") as f:
    html_content = f.read()

# Find all entry-title tags
pattern = r'<h[1-6][^>]*class="[^"]*entry-title[^"]*"[^>]*>(.*?)</h[1-6]>'
matches = re.findall(pattern, html_content, re.IGNORECASE | re.DOTALL)

for match in matches[:5]:
    # Extract text from link
    link_match = re.search(r'<a[^>]*>(.*?)</a>', match, re.IGNORECASE | re.DOTALL)
    if link_match:
        title = link_match.group(1).strip()
        print(f"- {title}")
