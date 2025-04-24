import CoverArt from "../components/CoverArt/CoverArt";
import Layout from "../components/Layout";

export default function Music({ title }) {
  return (
    <>
      <Layout pageTitle={`jowtow | Music`}>
        <h1>jowtow music</h1>

        <p>jowtow also creates music!</p>
        <p>
          get in touch with jowtow @ <address>johnjohnjdubya@gmail.com</address>
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
