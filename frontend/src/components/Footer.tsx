import { Twitter, Github, Disc } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../assets/unilateral_logo.png';

export function Footer() {
  return (
    <footer className="bg-foreground/[0.02] border-t border-foreground/10 mt-32 relative overflow-hidden">
      {/* Background Buildings/Landmarks */}
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
        {/* Eiffel Tower - Left */}
        <svg className="absolute left-[5%] bottom-0 h-[200px] w-auto" viewBox="0 0 100 300" fill="currentColor">
          <path d="M50 10 L50 290 M35 80 L65 80 M30 150 L70 150 M25 220 L75 220 M50 10 L25 220 M50 10 L75 220 M35 80 L30 150 M65 80 L70 150 M30 150 L25 220 M70 150 L75 220 M20 290 L80 290" />
        </svg>

        {/* Statue of Liberty */}
        <svg className="absolute left-[15%] bottom-0 h-[180px] w-auto" viewBox="0 0 100 300" fill="currentColor">
          <path d="M50 40 L45 45 L45 90 M50 40 L55 45 L55 90 M40 90 L60 90 M50 90 L50 280 M35 280 L65 280 M50 30 L40 40 L60 40 L50 30 M45 25 L50 15 L55 25" />
          <circle cx="50" cy="100" r="8" fill="currentColor" />
        </svg>

        {/* Modern Building 1 */}
        <svg className="absolute left-[28%] bottom-0 h-[150px] w-auto" viewBox="0 0 80 200" fill="currentColor">
          <rect x="10" y="50" width="60" height="150" />
          <path d="M20 70 L30 70 M20 90 L30 90 M20 110 L30 110 M20 130 L30 130 M20 150 L30 150 M20 170 L30 170 M50 70 L60 70 M50 90 L60 90 M50 110 L60 110 M50 130 L60 130 M50 150 L60 150 M50 170 L60 170" stroke="white" strokeWidth="1.5" />
        </svg>

        {/* Taj Mahal */}
        <svg className="absolute left-[38%] bottom-0 h-[160px] w-auto" viewBox="0 0 150 250" fill="currentColor">
          <path d="M30 120 L120 120 L120 220 L30 220 Z M75 50 L50 120 L100 120 L75 50 M20 220 L130 220 L125 240 L25 240 Z" />
          <circle cx="75" cy="60" r="15" fill="currentColor" />
        </svg>

        {/* Modern Building 2 */}
        <svg className="absolute left-[52%] bottom-0 h-[140px] w-auto" viewBox="0 0 100 180" fill="currentColor">
          <rect x="15" y="40" width="70" height="140" />
          <path d="M25 60 L35 60 M25 80 L35 80 M25 100 L35 100 M25 120 L35 120 M25 140 L35 140 M25 160 L35 160 M50 60 L60 60 M50 80 L60 80 M50 100 L60 100 M50 120 L60 120 M50 140 L60 140 M50 160 L60 160 M65 60 L75 60 M65 80 L75 80 M65 100 L75 100 M65 120 L75 120 M65 140 L75 140 M65 160 L75 160" stroke="white" strokeWidth="1.5" />
        </svg>

        {/* Great Pyramid */}
        <svg className="absolute left-[64%] bottom-0 h-[145px] w-auto" viewBox="0 0 150 240" fill="currentColor">
          <path d="M75 20 L10 220 L140 220 Z M75 20 L75 220 M40 140 L110 140 M25 180 L125 180" />
        </svg>

        {/* Modern Building 3 */}
        <svg className="absolute left-[76%] bottom-0 h-[170px] w-auto" viewBox="0 0 90 220" fill="currentColor">
          <rect x="15" y="50" width="60" height="170" />
          <rect x="10" y="30" width="70" height="20" />
          <path d="M25 70 L35 70 M25 90 L35 90 M25 110 L35 110 M25 130 L35 130 M25 150 L35 150 M25 170 L35 170 M25 190 L35 190 M55 70 L65 70 M55 90 L65 90 M55 110 L65 110 M55 130 L65 130 M55 150 L65 150 M55 170 L65 170 M55 190 L65 190" stroke="white" strokeWidth="1.5" />
        </svg>

        {/* Big Ben */}
        <svg className="absolute right-[5%] bottom-0 h-[190px] w-auto" viewBox="0 0 80 280" fill="currentColor">
          <rect x="25" y="80" width="30" height="200" />
          <rect x="20" y="50" width="40" height="30" />
          <circle cx="40" cy="40" r="18" fill="currentColor" />
          <path d="M30 260 L50 260 M30 220 L50 220 M30 180 L50 180 M30 140 L50 140 M30 100 L50 100" stroke="white" strokeWidth="1.5" />
          <rect x="15" y="10" width="50" height="15" />
        </svg>

        {/* Christ the Redeemer */}
        <svg className="absolute left-[2%] bottom-0 h-[135px] w-auto" viewBox="0 0 120 200" fill="currentColor">
          <path d="M60 40 L60 180 M20 60 L100 60 M60 180 L45 200 M60 180 L75 200" />
          <circle cx="60" cy="25" r="12" fill="currentColor" />
        </svg>

        {/* Colosseum */}
        <svg className="absolute right-[18%] bottom-0 h-[125px] w-auto" viewBox="0 0 180 220" fill="currentColor" opacity="0.6">
          <ellipse cx="90" cy="200" rx="85" ry="20" />
          <ellipse cx="90" cy="150" rx="85" ry="20" />
          <ellipse cx="90" cy="100" rx="85" ry="20" />
          <path d="M5 100 L5 200 M45 95 L45 205 M85 95 L85 205 M135 95 L135 205 M175 100 L175 200" />
        </svg>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-20 md:pb-12 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
              <img src={logo} alt="Unilateral" className="w-5 h-5 rounded-md" />
              <span className="text-sm tracking-tight" style={{ fontWeight: 700 }}>Unilateral</span>
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground leading-relaxed">
              © 2025 Unilateral. ALL RIGHTS RESERVED
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-[10px] md:text-xs mb-2 md:mb-3 tracking-wide" style={{ fontWeight: 700 }}>PRODUCT</h4>
            <ul className="space-y-1.5 md:space-y-2 text-[10px] md:text-xs">
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  CLASSES
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  SNAPS
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  OPINIQ
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-[10px] md:text-xs mb-2 md:mb-3 tracking-wide" style={{ fontWeight: 700 }}>RESOURCES</h4>
            <ul className="space-y-1.5 md:space-y-2 text-[10px] md:text-xs">
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  GITBOOK
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Us */}
          <div>
            <h4 className="text-[10px] md:text-xs mb-2 md:mb-3 tracking-wide" style={{ fontWeight: 700 }}>CONTACT US</h4>
            <ul className="space-y-1.5 md:space-y-2 text-[10px] md:text-xs">
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  X
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  TELEGRAM
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  MAIL
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-[10px] md:text-xs mb-2 md:mb-3 tracking-wide" style={{ fontWeight: 700 }}>COMPANY</h4>
            <ul className="space-y-1.5 md:space-y-2 text-[10px] md:text-xs">
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  ABOUT US
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  TERM AND CONDITION
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  PRIVACY POLICY
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}