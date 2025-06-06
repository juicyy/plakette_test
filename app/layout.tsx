import { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import React from 'react'
import { ThemeProvider } from "./providers"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Heizungsplakette',
  description: 'Ihre Heizungsplakette einfach und schnell',
  icons: {
    icon: [
      { url: '/images/Heizungsplakette-FavIcon.png', type: 'image/png' },
      { url: '/images/favicon.ico', type: 'image/x-icon' },
    ],
    shortcut: ['/images/Heizungsplakette-FavIcon.png'],
    apple: [
      { url: '/images/Heizungsplakette-FavIcon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/images/Heizungsplakette-FavIcon.png" type="image/png" />
        <link rel="shortcut icon" href="/images/favicon.ico" type="image/x-icon" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}