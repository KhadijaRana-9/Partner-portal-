import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-6 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Compass className="h-7 w-7" />
      </div>
      <p className="font-display text-5xl font-bold text-ink-900">404</p>
      <h1 className="mt-2 font-display text-lg font-semibold text-ink-800">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-500">
        The page you’re looking for doesn’t exist or may have been moved.
      </p>
      <Link to="/" className="mt-6">
        <Button>Back to Home</Button>
      </Link>
    </div>
  )
}
