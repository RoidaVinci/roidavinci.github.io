import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchArticles } from '../lib/api';

interface Article {
  slug: string;
  title: string;
}

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    fetchArticles().then(setArticles);
  }, []);

  return (
    <div>
      <h1>About Me</h1>
      <p>This is my professional website built with React and FastAPI.</p>

      <h2>Articles</h2>
      <ul>
        {articles.map((a) => (
          <li key={a.slug}>
            <Link to={`/articles/${a.slug}`}>{a.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
