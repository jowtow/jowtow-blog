import Image from "next/image";

export default function CoverArt({ img, title, size }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        boxShadow: "0px 0px 50px rgb(18, 18, 18)",
        width: "fit-content",
      }}
    >
      <Image src={img} width={size} height={size}></Image>
      {title && <span style={{ margin: "5px" }}>{title}</span>}
    </div>
  );
}
