import Link from "next/link";
import matter from "gray-matter";
import ReactMarkdown from "react-markdown";
import Author from "../../components/Author";
import styles from "./[postname].module.css";
import remarkGfm from "remark-gfm";

export default function BlogPost({ siteTitle, frontmatter, markdownBody }) {
  if (!frontmatter) return <></>;

  return (
    <>
      <article className={styles.post}>
        <h1 className={styles.postTitle}>{frontmatter.title}</h1>
        <p className={styles.postAuthor}>by {frontmatter.author}</p>
        <p className={styles.postDate}>{frontmatter.date}</p>
        <div className={styles.postBody}>
          <ReactMarkdown remarkPlugins={remarkGfm}>
            {markdownBody}
          </ReactMarkdown>
        </div>
      </article>
      <Author></Author>
      <Link href="/">
        <a className={styles.more}>←_← more posts!</a>
      </Link>
    </>
  );
}

export async function getStaticProps({ ...ctx }) {
  const { postname } = ctx.params;

  const content = await import(`../../posts/${postname}.md`);
  const config = await import(`../../siteconfig.json`);
  const data = matter(content.default);

  return {
    props: {
      siteTitle: config.title,
      frontmatter: data.data,
      markdownBody: data.content,
    },
  };
}

export async function getStaticPaths() {
  const blogSlugs = ((context) => {
    const keys = context.keys();
    const data = keys.map((key, index) => {
      let slug = key.replace(/^.*[\\\/]/, "").slice(0, -3);

      return slug;
    });
    return data;
  })(require.context("../../posts", true, /\.md$/));

  const paths = blogSlugs.map((slug) => `/post/${slug}`);

  return {
    paths,
    fallback: false,
  };
}
