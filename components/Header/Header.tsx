import Link from "next/link";

export default function Header() {
  return (
    <>
      <header className="mx-[15px] my-[10px] lg:mx-[20vw] p-[5px] border-b border-[var(--color-primary)]">
        <nav className="nav">
          <Link href="/">
            <span className="text-[var(--color-primary)]">blog</span>.
            <span className="text-[var(--color-secondary)]">jowtow.dev</span>
          </Link>
          <Link href="/posts" className="m-3">
            posts
          </Link>
          <Link href="/music" className="m-3">
            music
          </Link>
          <Link href="/about" className="m-3">
            about
          </Link>
        </nav>
      </header>
    </>
  );
}
