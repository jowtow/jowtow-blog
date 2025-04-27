import CoverArt from "../components/CoverArt/CoverArt";
import Link from "next/link";

export default function Music({ title }) {
  return (
    <>
      <h1>jowtow music</h1>

      <p>
        jowtow is an up and coming musician with an electronic spin on the
        world. His intensity and tomfoolery know no bounds when it comes to
        making beats that will make you get on your feet. Check out his music on
        Spotify or anywhere that you can find music!
      </p>
      <p>Full Name: John Townsend</p>
      <p>
        Email:{" "}
        <a href="mailto:johnjohnjdubya@gmail.com">johnjohnjdubya@gmail.com</a>
      </p>

      <h2 style={{ textAlign: "center" }}>Releases</h2>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Link href="/music/golden">
          <a style={{ width: "fit-content", margin: "10px" }}>
            <CoverArt
              img="/coverart/Golden_CoverArt.png"
              title="Golden"
              size={300}
            />
          </a>
        </Link>
        <div style={{ width: "fit-content", margin: "10px" }}>
          <CoverArt
            img="/coverart/GetDownToIt_CoverArt.png"
            title="Get Down To It (Sample)"
            size={300}
          />
        </div>
      </div>
    </>
  );
}
