import Head from "next/head";
import Header from "./Header";
import styles from "./Layout.module.css";
import Script from "next/script";

export default function Layout({ children, pageTitle, ...props }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{pageTitle}</title>
      </Head>
      <section className="layout">
        <Header />
        <div className={styles.content}>{children}</div>
      </section>
    </>
  );
}
