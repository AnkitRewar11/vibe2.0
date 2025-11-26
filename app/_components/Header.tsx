'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'                // <-- Next.js Link
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'  // <-- only the icon you need
import { SignInButton, useUser } from '@clerk/nextjs'

const MenuOptions = [
  { name: 'Pricing', path: '/pricing' },
  { name: 'Contact us', path: '/contact-us' },
]

export default function Header() {
  const { isSignedIn } = useUser()

  return (
    <header className="flex items-center justify-between p-4 shadow">
      <div className="flex gap-2 items-center">
        <Image src="/logo.svg" alt="Logo" width={35} height={35} />
        <h2 className="font-bold text-xl">AI Website Builder</h2>
      </div>

      <nav className="flex gap-3">
        {MenuOptions.map((menu, i) => (
          <Link key={i} href={menu.path}>
            <Button variant="ghost">{menu.name}</Button>
          </Link>
        ))}
      </nav>

      <div>
        {!isSignedIn ? (
          <SignInButton mode="modal" forceRedirectUrl="/workspace">
            <Button>Get Started <ArrowRight /></Button>
          </SignInButton>
        ) : (
          <Link href="/workspace">
            <Button>Get Started <ArrowRight /></Button>
          </Link>
        )}
      </div>
    </header>
  )
}
