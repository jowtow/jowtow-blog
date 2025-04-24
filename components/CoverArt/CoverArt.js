import Image from "next/image";

export default function CoverArt({ img, title }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        margin: "10px",
        // borderRadius: "5px",
        boxShadow: "0px 0px 50px rgb(187, 153, 41)",
        backgroundColor: "rgb(30, 30, 30)",
      }}
    >
      <Image src={img} width={200} height={200}></Image>
      <span style={{ margin: "5px" }}>{title}</span>
    </div>
  );
}
