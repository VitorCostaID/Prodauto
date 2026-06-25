/**
 * AppLayout — wraps every page with the header (desktop) and footer nav (mobile).
 * Navigation: Pesquisas | Produto Perfeito | Conta
 */
import { NavLink } from 'react-router-dom'
import { Search, Sparkles, User, Info } from 'lucide-react'
import { clsx } from 'clsx'

interface Props {
  children: React.ReactNode
}

const NAV_ITEMS = [
  { to: '/',                 label: 'Pesquisas',       Icon: Search    },
  { to: '/produto-perfeito', label: 'Produto Perfeito', Icon: Sparkles  },
  { to: '/conta',            label: 'Conta',           Icon: User      },
  { to: '/sobre',            label: 'Sobre',           Icon: Info      },
]

export default function AppLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Desktop header ───────────────────────────────────────── */}
      <header className="hidden md:flex bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto w-full px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-brand-600 text-lg tracking-tight">
            Prodauto
          </span>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                  )
                }
              >
                <Icon size={15} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Page content ─────────────────────────────────────────── */}
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>

      {/* ── Mobile bottom nav ────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20">
        <div className="flex">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                clsx(
                  'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors',
                  isActive ? 'text-brand-600' : 'text-gray-400'
                )
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
