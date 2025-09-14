import Link from "next/link";

export default function Header() {
  return (
    <>
      <header className=" mb-[10px] p-[5px] bg-[url(/header.png)] bg-right bg-no-repeat bg-cover] min-h-[200px] mb-[25px] bg-[size:2500px_200px] flex justify-start xl:justify-center">
        <nav className="nav xl:mx-25 mx-10 my-10 bg-[var(--color-dark)] h-fit p-4 rounded">
          <Link href="/">
            <span className="text-[var(--color-primary)]">blog</span>.
            <span className="">jowtow.dev</span>
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
