import React from "react";
import CoverArt from "../../components/CoverArt/CoverArt";
import confetti from "canvas-confetti";
import Image from "next/image";
import {
  faYoutube,
  faSpotify,
  faApple,
} from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";

export default function Golden() {
  const size = 400;
  const shearRef = React.useRef();
  function mouseMove(e) {
    if (!shearRef) return;

    const rect = shearRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = -(y - centerY) / 10;
    const rotateY = (x - centerX) / 10;

    const shadowX = -(x - centerX) / 7;
    const shadowY = -(y - centerY) / 7;

    shearRef.current.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
    shearRef.current.style.boxShadow = `${shadowX}px ${shadowY}px 400px rgb(206, 162, 0)`;
  }

  function resetTransform(e) {
    shearRef.current.style.transform = "rotateX(0deg) rotateY(0deg) scale(1)";

    shearRef.current.style.boxShadow = "0 0px 50px rgb(206, 162, 0)";
  }

  function mouseEnter(e) {
    shearRef.current.style.transition =
      "transform 0.15s ease, box-shadow 0.5s ease";
  }

  React.useEffect(() => {
    var end = Date.now() + 15 * 1000;
    var colors = ["#DAA520"];

    (function frame() {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginTop: "50px",
      }}
    >
      <div
        style={{
          width: "fit-content",
          margin: "0 auto",
          boxShadow: "0 0px 50px rgb(206, 162, 0)",
        }}
        ref={shearRef}
        onMouseMove={(e) => mouseMove(e)}
        onMouseLeave={(e) => resetTransform(e)}
        onMouseEnter={(e) => mouseEnter(e)}
      >
        <CoverArt
          img="/coverart/Golden_CoverArt.png"
          title={null}
          size={size}
        />
      </div>
      <h1 style={{ marginTop: "50px" }}>Golden is out now!</h1>
      <p>Check it out, anywhere you listen to music</p>
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ margin: "20px" }}>
          <Link
            href="https://open.spotify.com/artist/3DB1cb0YaTkAu6Jb7O0ICW?si=r65g-8vXSD2DC-UrzU6tXw"
            replace={false}
          >
            <a target="blank">
              <FontAwesomeIcon
                icon={faSpotify}
                fontSize={50}
                color="goldenrod"
              />
            </a>
          </Link>
        </div>
        <div style={{ margin: "20px" }}>
          <Link
            href="https://youtu.be/twjHrQTQwPs?si=oAi7pXhr_bLRpjKw"
            replace={false}
          >
            <a target="blank">
              <FontAwesomeIcon
                icon={faYoutube}
                fontSize={50}
                color="goldenrod"
              />
            </a>
          </Link>
        </div>
        <div style={{ margin: "20px" }}>
          <Link href="https://music.apple.com/us/artist/jowtow/1808178421">
            <a target="blank">
              <FontAwesomeIcon icon={faApple} fontSize={50} color="goldenrod" />
            </a>
          </Link>
        </div>
      </div>
      <div>
        <h2 style={{ textAlign: "center" }}>
          Make sure to check out the music video on YouTube as well
        </h2>
        <Link href="https://youtu.be/twjHrQTQwPs?si=oAi7pXhr_bLRpjKw">
          <a target="_blank">
            <Image
              src="/coverart/Golden_Thumbnail.png"
              width={711}
              height={400}
            />
          </a>
        </Link>
      </div>
    </div>
  );
}
