import styles from './PostList.module.css'
import Link from 'next/link'

export default function PostList({ posts }) {
  if (posts === 'undefined') return null

  return (
    <div>
      {!posts && <div>No posts!</div>}
      <div className={styles.postsContainer}>
        {posts &&
          posts.map((post) => {
            return (
              <div key={post.slug} className={styles.postContainer}>
                <Link href={`/post/${post.slug}`}>
                  <a className={styles.postLink}>
                    <div className={styles.imgContainer}>

                      <img
                        className={styles.authorImage}
                        src={post.frontmatter.image}
                        alt="Picture of the author."
                      />

                    </div>
                    <div className={styles.metadata}>
                      <span>{post.frontmatter.title}</span>
                      <span>{post.frontmatter.date}</span>
                    </div>
                  </a>
                </Link>
              </div>
            )
          })}
      </div>
    </div>
  )
}
