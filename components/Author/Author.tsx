// import styles from './Author.module.css'

import Image from "next/image";

export default function Author() {
  return (
    <>
      <div className="relative m-2 p-1 rounded border-2 border-[var(--color-primary)] flex flex-col md:flex-row items-center">
        <div className="relative w-[100px] h-[100px] aspect-[5/5] m-2">
          <Image
            className="rounded-full"
            src="/Author.webp"
            alt="Picture of the author."
            fill
          />
        </div>
        <div className="flex flex-col justify-center">
          <div className="text-lg text-center">
            Howdy, I&apos;m John Townsend! Thanks for checking out the blog!
          </div>
          <div className="text-center">
            I love learning new things and sharing knowledge with others. My
            profession is Software Engineering, but I love to learn about other
            trades and crafts as well.
          </div>
        </div>
      </div>
    </>
  );
}
