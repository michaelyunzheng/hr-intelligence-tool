import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Forma — Workforce Intelligence',description:'Understand your people. Shape what comes next. A synthetic workforce intelligence demo.'};
export default function RootLayout({children}:{children:React.ReactNode}) {
 return <html lang="en"><body>{children}</body></html>;
}
