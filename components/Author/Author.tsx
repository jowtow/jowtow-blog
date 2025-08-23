// import styles from './Author.module.css'

import Image from "next/image";

export default function Author() {
  return (
    <>
      <div className="m-2 p-1 rounded border-2 border-[var(--color-primary)] flex ">
        <Image
          className="rounded-full m-2 mr-5"
          src="/Author.jpg"
          alt="Picture of the author."
          height={100}
          width={100}
        />
        <div className="flex flex-col justify-center">
          <div className="text-lg">
            Howdy, I&apos;m John Townsend! Thanks for checking out the blog!
          </div>
          <div>
            I love learning new things and sharing knowledge with others. My
            profession is Software Engineering, but I love to learn about other
            trades and crafts as well.
          </div>
        </div>
      </div>
    </>
  );
}
