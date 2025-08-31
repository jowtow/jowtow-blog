import Image from "next/image";

export default function PixelHat({
  children,
  imgPath,
  className,
}: {
  children: React.ReactNode;
  imgPath: string;
  className?: string | null | undefined;
}) {
  return (
    <div className={`relative inline-block ${className}`}>
      <Image src={imgPath} height={10} width={10} alt="hat" />
      {children}
    </div>
  );
}
