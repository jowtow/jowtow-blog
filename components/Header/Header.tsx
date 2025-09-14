import Link from "next/link";

export default function Header() {
  return (
    <>
      <header className="p-[5px] bg-[url(/header.png)] bg-right bg-no-repeat bg-cover] min-h-[200px] bg-[size:2500px_200px] flex justify-start xl:justify-center">
        <nav className="nav xl:mx-25 mx-3 lg:mx-10 my-5 sm:my-10 bg-[var(--color-dark)] h-fit p-4 rounded flex flex-col sm:flex-row ">
          <div className="text-center border-b sm:border-none">
            <Link href="/">
              <span className="text-[var(--color-primary)]">blog</span>.
              <span className="">jowtow.dev</span>
            </Link>
          </div>
          <div>
            <Link href="/posts" className="m-3">
              posts
            </Link>
            <Link href="/music" className="m-3">
              music
            </Link>
            <Link href="/about" className="m-3">
              about
            </Link>
          </div>
        </nav>
      </header>
    </>
  );
}
