import "./globals.css";

export const metadata = {
  title: "Call Desk",
  description: "Voice agent call recordings and transcripts",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
