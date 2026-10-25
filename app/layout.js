import "./globals.css";

export const metadata = {
  title: "GE Workshop | Combination Flipper",
  description: "Live OSRS Grand Exchange combination and deconstruction margins.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
