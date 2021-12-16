import { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';

import format from 'date-fns/format';
import { ptBR } from 'date-fns/locale';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';

import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import { getPrismicClient } from '../../services/prismic';

import Header from '../../components/Header';
// import Comments from '../../components/Comments';

import styles from './post.module.scss';
import commonStyles from '../../styles/common.module.scss';
import { useEffect, useRef } from 'react';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
  pagination: {
    nextPage: {
      href: string;
      title: string;
    };
    prevPage: {
      href: string;
      title: string;
    };
  };
}

export default function Post({ post, pagination, preview }: PostProps) {
  const router = useRouter();

  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  const totalWords = post.data.content.reduce((total, contentItem) => {
    total += contentItem.heading.split(' ').length;

    const words = contentItem.body.map(item => item.text.split(' ').length);
    words.map(word => (total += word));

    return total;
  }, 0);

  const readingTime = Math.ceil(totalWords / 200);

  const formatedFirstPublicationDate = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    { locale: ptBR }
  );

  const commentsSection = useRef<HTMLDivElement>();

  useEffect(() => {
    const hasScript = commentsSection?.current.querySelector('.utterances');

    if (hasScript) {
      hasScript.remove();
    }

    const utteranceScript = document.createElement('script');

    utteranceScript.setAttribute('src', 'https://utteranc.es/client.js');
    utteranceScript.setAttribute('crossorigin', 'anonymous');
    utteranceScript.setAttribute('async', 'true');
    utteranceScript.setAttribute(
      'repo',
      'paulabonini/ignite-create-Project-from-0'
    );
    utteranceScript.setAttribute('issue-term', 'pathname');
    utteranceScript.setAttribute('theme', 'github-dark');

    commentsSection.current?.appendChild(utteranceScript);
  }, [post]);

  return (
    <>
      <Head>
        <title>{`${post.data.title} | spacetraveling`}</title>
      </Head>
      <Header />
      <img
        src={post.data.banner.url}
        alt={post.data.title}
        className={styles.banner}
      />
      <div className={styles.container}>
        <article>
          <header>
            {router.isFallback && (
              <strong className={commonStyles.loading}>Carregando...</strong>
            )}
            <h1>{post.data.title}</h1>

            <footer>
              <div>
                <FiCalendar size={'1.25rem'} className={styles.icon} />
                <time>{formatedFirstPublicationDate}</time>
              </div>
              <div>
                <FiUser size={'1.25rem'} className={styles.icon} />
                <p>{post.data.author}</p>
              </div>
              <div>
                <FiClock size={'1.25rem'} className={styles.icon} />
                <p>{`${readingTime} min`}</p>
              </div>
            </footer>

            {post?.last_publication_date && (
              <span className={commonStyles.lastEdit}>
                {format(
                  new Date(post.last_publication_date),
                  "'* editado em 'dd MMM yyyy', às' HH:mm",
                  { locale: ptBR }
                )}
              </span>
            )}
          </header>
          {post.data.content.map(item => (
            <div key={item.heading}>
              <h2>{item.heading}</h2>
              <div
                className={styles.postContent}
                dangerouslySetInnerHTML={{ __html: RichText.asHtml(item.body) }}
              />
            </div>
          ))}
        </article>
        <hr />
        <section>
          {pagination && (
            <section className={commonStyles.pagination}>
              {pagination?.prevPage && (
                <span>
                  {pagination.prevPage.title}
                  <Link href={pagination.prevPage.href}>
                    <a>Post Anterior</a>
                  </Link>
                </span>
              )}

              {pagination?.nextPage && (
                <span className={commonStyles.nextPost}>
                  {pagination.nextPage.title}
                  <Link href={pagination.nextPage.href}>
                    <a>Próximo Post</a>
                  </Link>
                </span>
              )}
            </section>
          )}
        </section>
        <section ref={commentsSection} />

        {preview && (
          <aside className={styles.aside}>
            <Link href="/api/exit-preview">
              <a>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      orderings: '[document.first_publication_date desc]',
      pageSize: 2,
    }
  );

  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref || null,
  });

  const {
    results: [nextPage],
  } = await prismic.query([Prismic.predicates.at('document.type', 'posts')], {
    pageSize: 1,
    after: response.id,
    orderings: '[document.first_publication_date]',
  });

  const {
    results: [prevPage],
  } = await prismic.query([Prismic.predicates.at('document.type', 'posts')], {
    pageSize: 1,
    after: response.id,
    orderings: '[document.first_publication_date desc]',
  });

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date:
      response.first_publication_date !== response.last_publication_date
        ? response.last_publication_date
        : null,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content,
    },
  };

  const pagination = {
    nextPage: nextPage
      ? {
          title: nextPage?.data.title,
          href: `/post/${nextPage?.uid}`,
        }
      : null,
    prevPage: prevPage
      ? {
          title: prevPage.data.title,
          href: `/post/${prevPage.uid}`,
        }
      : null,
  };

  return {
    props: {
      post,
      preview,
      pagination,
    },
    revalidate: 60 * 30, // 30 minutes
  };
};
