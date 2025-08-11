export async function fetchArticles() {
  const res = await fetch('/api/articles');
  const data = await res.json();
  return data.articles;
}

export async function fetchArticle(slug: string) {
  const res = await fetch(`/api/articles/${slug}`);
  return res.json();
}
