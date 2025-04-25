import CoverArt from "../components/CoverArt/CoverArt";
import Layout from "../components/Layout";

export default function Music({ title }) {
  return (
    <>
      <Layout pageTitle={`jowtow | Music`}>
        <h1>jowtow music</h1>

        <p>
          jowtow is an up and coming musician with an electronic spin on the
          world. His intensity and tomfoolery know no bounds when it comes to
          making beats that will make you get on your feet. Check out his music
          on Spotify or anywhere that you can find music!
        </p>
        <p>Full Name: John Townsend</p>
        <p>
          Email:{" "}
          <a href="mailto:johnjohnjdubya@gmail.com">johnjohnjdubya@gmail.com</a>
        </p>

        <h2 style={{ textAlign: "center" }}>Releases</h2>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <CoverArt
            img="/coverart/GetDownToIt_CoverArt.png"
            title="Get Down To It (Sample)"
          />
          <CoverArt img="/coverart/Golden_CoverArt.png" title="Golden" />
        </div>
      </Layout>
    </>
  );
}
