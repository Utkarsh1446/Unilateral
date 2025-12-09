import { TrendingUp, Users, Wallet, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export function MobileBottomNav() {
  const location = useLocation();
  
  const navItems = [
    { icon: TrendingUp, label: 'Markets', path: '/markets' },
    { icon: Users, label: 'Creators', path: '/creators' },
    { icon: Wallet, label: 'Portfolio', path: '/profile?tab=portfolio' },
    { icon: User, label: 'Account', path: '/profile' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-foreground/10 z-40 safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
                          (item.path !== '/' && location.pathname.startsWith(item.path));
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors flex-1 ${
                isActive ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2]' : 'stroke-[1.5]'}`} />
              <span className="text-[10px] uppercase tracking-wider" style={{ fontWeight: isActive ? 600 : 400, letterSpacing: '0.05em' }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
