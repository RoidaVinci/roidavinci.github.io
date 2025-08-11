from fastapi import FastAPI, HTTPException
from pathlib import Path
import markdown

app = FastAPI(title="Personal Site API")

ARTICLES_DIR = Path(__file__).resolve().parents[2] / "articles" / "src"

def load_article(slug: str) -> dict:
    file_path = ARTICLES_DIR / f"{slug}.md"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Article not found")
    md_content = file_path.read_text(encoding="utf-8")
    html = markdown.markdown(md_content, extensions=["fenced_code", "toc", "tables"])
    title = md_content.splitlines()[0].lstrip("# ").strip()
    return {"slug": slug, "title": title, "html": html}

@app.get("/api/articles")
def list_articles():
    articles = []
    for p in sorted(ARTICLES_DIR.glob("*.md")):
        first_line = p.read_text(encoding="utf-8").splitlines()[0]
        title = first_line.lstrip("# ").strip()
        articles.append({"slug": p.stem, "title": title})
    return {"articles": articles}

@app.get("/api/articles/{slug}")
def get_article(slug: str):
    return load_article(slug)
