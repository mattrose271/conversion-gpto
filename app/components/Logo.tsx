export default function Logo() {
  const LOGO_PATH = "/ConversionLogo.svg";

  return (
    <img 
      src={LOGO_PATH}
      alt="Conversion Interactive Agency" 
      style={{ height: "40px", width: "auto", maxWidth: "200px", paddingLeft: "16px" }}
    />
  );
}
