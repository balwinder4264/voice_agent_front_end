import "./globals.css";

export const metadata = {
  title: "ReserveSync",
  description: "Reservation management, calls, and scheduling in one workspace",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
