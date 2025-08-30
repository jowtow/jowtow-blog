import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAddressCard,
  faBriefcase,
  faMusic,
  faPaintBrush,
} from "@fortawesome/free-solid-svg-icons";
import {
  faGithub,
  faLinkedin,
  faYoutube,
  faSpotify,
  faStackOverflow,
} from "@fortawesome/free-brands-svg-icons";
import Image from "next/image";
import Link from "next/link";
import JowTowTransition from "@/components/JowTowTransition/JowTowTransition";
export default function About() {
  return (
    <>
      <div className="flex flex-col items-center py-0 px-[20px] border-b-2 border-[var(--color-primary)]">
        <div className="m-2 p-2 rounded flex flex-col items-center justify-center">
          <Image
            height={150}
            width={150}
            src="/Author.jpg"
            alt="Picture of the author."
            className="rounded-full border-3 border-[var(--color-primary)]"
          />
          <span className="m-5 text-[30px]">
            <JowTowTransition />
          </span>
        </div>
        <div className="mx-[20px] flex flex-col items-center justify-between max-w-[600px]">
          <div className={`flex flex-col items-center justify-between`}>
            <FontAwesomeIcon
              icon={faAddressCard}
              className="w-[50] m-3 text-[var(--color-secondary)]"
            />
            <p className="p-1 text-center w-[50ch]">
              I&apos;m a not-so-ordinary guy from the southeast corner of South
              Dakota. I am on a constant journey of curiosity and learning so
              hop aboard the blog train and let&apos;s partake in some
              tomfoolery!
            </p>
          </div>
          <div className="flex flex-col items-center justify-between">
            <FontAwesomeIcon
              icon={faBriefcase}
              className="w-[50] m-3 text-[var(--color-secondary)]"
            />
            <p className="p-1 text-center w-[50ch]">
              My main profession and passion is Software Engineering. I attended
              Dakota State University and received my Bachelors Degree in
              Computer Science and Mathematics in the Spring of 2019.
            </p>
          </div>
          <div className="flex flex-col items-center justify-between">
            <FontAwesomeIcon
              icon={faMusic}
              className="w-[50] m-3 text-[var(--color-secondary)]"
            />
            <p className="p-1 text-center w-[50ch]">
              Singing, dancing, and all other mediums of experiencing music are
              some of my favorite pass-times. You can often find me jamming to a
              capella metal or future bass. I was classically trained to sing
              Italian arias and such, but you can also find me doing my best
              Jack Black, Tenacious D style.
            </p>
          </div>
          <div className="flex flex-col items-center justify-between">
            <FontAwesomeIcon
              icon={faPaintBrush}
              className="w-[50] m-3 text-[var(--color-secondary)]"
            />
            <p className="p-1 text-center w-[50ch]">
              I am a sporadic partaker in the painting of rocks. A few years
              ago, my wife got me started on painting rocks and it&apos;s stuck
              with me ever since. I also love photoshopping pictures of people
              into scenery in which they don&apos;t belong.
            </p>
          </div>
        </div>
        <div className="mx-[40px] w-full flex items-center justify-center text-xl ">
          <Link
            href="https://github.com/jowtow"
            target="_blank"
            rel="noreferrer"
            className="w-10 m-5"
          >
            <FontAwesomeIcon icon={faGithub} className="" />
          </Link>
          <a
            href="https://stackoverflow.com/users/8167458/john-townsend"
            target="_blank"
            rel="noreferrer"
            className="w-10 m-5"
          >
            <FontAwesomeIcon icon={faStackOverflow} className="" />
          </a>
          <a
            href="https://www.linkedin.com/in/johntownsend/"
            target="_blank"
            rel="noreferrer"
            className="w-10 m-5"
          >
            <FontAwesomeIcon icon={faLinkedin} className="" />
          </a>
          <a
            href="https://www.youtube.com/channel/UCVxiiiRO17Sl95I0cctdfjg"
            target="_blank"
            rel="noreferrer"
            className="w-10 m-5"
          >
            <FontAwesomeIcon icon={faYoutube} className="" />
          </a>
          <a
            href="https://open.spotify.com/artist/3DB1cb0YaTkAu6Jb7O0ICW?si=11g42F1nS--HbYjr2WX7TA"
            target="_blank"
            rel="noreferrer"
            className="w-10 m-5"
          >
            <FontAwesomeIcon icon={faSpotify} className="" />
          </a>
        </div>
      </div>
    </>
  );
}
