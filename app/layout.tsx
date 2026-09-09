import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Collaborator — Help make it exist', description: 'A community workspace for the things we want to exist. Explore our first Mahabharata game mission.' };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en" className="dark"><body>{children}</body></html>}
