import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchArticle } from '../lib/api';

interface ArticleData {
  title: string;
  html: string;
}

export default function Article() {
  const { slug } = useParams();
  const [data, setData] = useState<ArticleData | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetchArticle(slug).then(setData);
  }, [slug]);

  if (!data) return <p>Loading...</p>;

  return (
    <article>
      <h1>{data.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: data.html }} />
    </article>
  );
}
