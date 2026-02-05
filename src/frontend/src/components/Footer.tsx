import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center text-sm text-gray-700 font-medium">
          © 2025. Built with{' '}
          <Heart className="inline h-4 w-4 fill-red-500 text-red-500 animate-pulse" /> using{' '}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold bg-gradient-to-r from-teal-600 via-blue-600 to-amber-500 bg-clip-text text-transparent hover:underline"
          >
            caffeine.ai
          </a>
        </div>
      </div>
    </footer>
  );
}
