import Link from "next/link";
import styles from "./Header.module.css";

export default function Header() {
  return (
    <>
      <header className={styles.header}>
        <nav className="nav">
          <Link href="/">
            <a className={styles.headerLinkHome}>
              <span className={styles.wordBlog}>blog</span>.
              <span className={styles.jowtowdev}>jowtow.dev</span>
            </a>
          </Link>
          <Link href="/postlist">
            <a className={styles.headerLink}>Posts</a>
          </Link>
          <Link href="/music">
            <a className={styles.headerLink}>Music</a>
          </Link>
          <Link href="/about">
            <a className={styles.headerLink}>About</a>
          </Link>
        </nav>
      </header>
    </>
  );
}
