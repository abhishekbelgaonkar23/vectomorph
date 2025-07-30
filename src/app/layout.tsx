import "~/styles/globals.css";

import type { Metadata } from "next";
import { Geist, Jersey_15 } from "next/font/google";
import { ErrorBoundary } from "~/components/ErrorBoundary";

export const metadata: Metadata = {
	title: "VectoMorph - Convert Images to SVG",
	description: "Convert raster images to scalable vector graphics (SVG) entirely in your browser. Privacy-focused, client-side processing with no data uploaded.",
	icons: [{ rel: "icon", url: "/Untitled.svg" }],
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

const jersey15 = Jersey_15({
	subsets: ["latin"],
	weight: "400",
	variable: "--font-jersey-15",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className={`${geist.variable} ${jersey15.variable}`}>
			<body>
				<ErrorBoundary>
					{children}
				</ErrorBoundary>
			</body>
		</html>
	);
}
