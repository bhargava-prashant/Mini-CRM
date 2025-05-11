

import { useState, useEffect } from 'react';
import backgroundVideo from '../assets/videos/background-video.mp4';
import { ShoppingBag, ChevronDown, Facebook, Instagram, Twitter, Mail, Phone } from 'lucide-react';
import { sign_in } from "../templates/sign_in"
export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative min-h-screen bg-black text-white overflow-x-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
        <div className="absolute inset-0 bg-black/70 z-10"></div>
        <video className="object-cover w-full h-full" autoPlay loop muted playsInline>
          <source src={backgroundVideo} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Navbar */}
      <header className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'py-2 bg-black/80 backdrop-blur-sm' : 'py-4 bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          {/* Logo and Brand */}
          <div className="flex items-center gap-4">
            <ShoppingBag size={28} />
            <span className="text-xl font-semibold">ELECES</span>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-lg">
            <a href="#" className="hover:text-gray-300">Home</a>
            <a href="#" className="hover:text-gray-300">Products</a>
            <a href="#" className="hover:text-gray-300">Collections</a>
            <a href="#" className="hover:text-gray-300">Contact</a>
          </nav>

          {/* User Menu */}
          <div className="relative">
            <button 
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/30 hover:bg-white/10 transition"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span>Welcome</span>
              <ChevronDown size={16} />
            </button>

            {/* Dropdown */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 bg-black/80 border border-white/20 rounded-lg w-40 shadow-lg z-50">
                <a href="#" className="block px-4 py-3 hover:bg-white/10">Login</a>
                <a href="#" className="block px-4 py-3 hover:bg-white/10">Sign Up</a>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <div className="relative">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6">
            <span className="block text-white drop-shadow-lg">Redefine Your Style</span>
          </h1>

          <div className="absolute -inset-6 -z-10 rounded-xl overflow-hidden opacity-30">
            <video className="object-cover w-full h-full" autoPlay loop muted playsInline>
              <source src="/api/placeholder/400/320" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80"></div>
          </div>
        </div>

        <p className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 text-gray-300 leading-relaxed">
          Discover curated collections that blend elegance with innovation for the modern lifestyle.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <button className="px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition transform hover:scale-105 shadow-md">
            Shop Now
          </button>
          <button className="px-6 py-3 border-2 border-white rounded-full font-semibold hover:bg-white/10 transition shadow-md">
            Explore Collections
          </button>
        </div>
      </main>

      {/* Scroll Indicator */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 animate-bounce">
        <div className="w-8 h-14 rounded-full border-2 border-white/50 flex justify-center items-start p-1">
          <div className="w-1.5 h-3 bg-white rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 bg-gray-950 text-gray-300 py-12 px-6 sm:px-10">
        <div className="max-w-7xl mx-auto flex flex-col gap-12">
          {/* Brand Info */}
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag size={32} />
              <span className="text-2xl font-semibold">ELECES</span>
            </div>
            <p className="max-w-md">Elevating everyday moments with exceptional design and quality since 2020.</p>
          </div>

          {/* Footer Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 text-center sm:text-left">
            {/* Shop */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Shop</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white">New Arrivals</a></li>
                <li><a href="#" className="hover:text-white">Best Sellers</a></li>
                <li><a href="#" className="hover:text-white">Sale</a></li>
                <li><a href="#" className="hover:text-white">Collections</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Sustainability</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Press</a></li>
              </ul>
            </div>

            {/* Connect */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Connect</h3>
              <div className="flex justify-center sm:justify-start gap-4 mb-3">
                <a href="#" className="hover:text-white"><Facebook size={22} /></a>
                <a href="#" className="hover:text-white"><Instagram size={22} /></a>
                <a href="#" className="hover:text-white"><Twitter size={22} /></a>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <Mail size={16} />
                  <span>support@luxeshop.com</span>
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <Phone size={16} />
                  <span>+1 (800) 123-4567</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="text-center text-sm text-gray-500 border-t border-white/10 pt-6">
            © 2025 ELECES. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
