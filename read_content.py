# -*- coding: utf-8 -*-
from bs4 import BeautifulSoup
import os

file_path = r"C:\Users\Albert Saputra\.gemini\antigravity\brain\a103e2eb-0533-401c-bd51-04c0eb5dcb7a\.system_generated\steps\146\content.md"

if not os.path.exists(file_path):
    print("File not found!")
    exit(1)

with open(file_path, "r", encoding="utf-8") as f:
    html_content = f.read()

# Parse the HTML content
soup = BeautifulSoup(html_content, "html.parser")

# Find the article element (which contains the README on GitHub)
article = soup.find("article")
if article:
    # Print the text within the article
    text = article.get_text("\n", strip=True)
    # Print first 2000 characters
    output_path = "d:/PKM/medsign-ai/readme_extracted.txt"
    with open(output_path, "w", encoding="utf-8") as out:
        out.write("=== README CONTENT ===\n")
        out.write(text[:8000])
    print(f"Extracted README content written to {output_path}")
else:
    print("Article tag not found.")
