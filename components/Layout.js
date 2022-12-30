import Head from 'next/head'
import Header from './Header'
import styles from './Layout.module.css'
import Script from 'next/script'

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
      <Script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="jowtowdev" data-description="Support me on Buy me a coffee!" data-message="Thanks for visiting, if you think I need more bean juice in my life, feel free to buy me a coffee!" data-color="#40DCA5" data-position="Right" data-x_margin="18" data-y_margin="18"></Script>
      {/* <footer>Built by me!</footer> */}
    </>
  )
}