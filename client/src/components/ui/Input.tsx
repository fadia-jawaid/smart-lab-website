// import type { InputHTMLAttributes, ReactNode } from 'react';
// import { cn } from '../../lib/cn';

// export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
//   label?: string;
//   error?: string;
//   icon?: ReactNode;
// }

// export function Input({ label, error, icon, id, className = '', ...props }: InputProps) {
//   const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

//   return (
//     <div className="flex flex-col gap-1.5">
//       {label && (
//         <label htmlFor={inputId} className="text-sm font-medium text-slate-300">
//           {label}
//         </label>
//       )}
//       <div className="relative">
//         {icon && (
//           <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
//             {icon}
//           </span>
//         )}
//         <input
//           id={inputId}
//           className={cn(
//             'w-full rounded-xl border bg-surface-2/60 px-3 py-2.5 text-slate-100 placeholder:text-slate-500',
//             'transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
//             icon && 'pl-10',
//             error ? 'border-danger/60' : 'border-hairline',
//             className,
//           )}
//           {...props}
//         />
//       </div>
//       {error && <p className="text-xs text-danger">{error}</p>}
//     </div>
//   );
// }



import { useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?:  ReactNode;
}

export function Input({ label, error, icon, id, className = '', type, ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const inputId    = id || label?.toLowerCase().replace(/\s+/g, '-');
  const isPassword = type === 'password';
  const inputType  = isPassword && showPassword ? 'text' : type;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        {/* Left icon */}
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}

        <input
          id={inputId}
          type={inputType}
          className={cn(
            'w-full rounded-xl border bg-surface-2/60 px-3 py-2.5 text-slate-100 placeholder:text-slate-500',
            'transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
            icon        && 'pl-10',
            isPassword  && 'pr-10',
            error ? 'border-danger/60' : 'border-hairline',
            className,
          )}
          {...props}
        />

        {/* Eye toggle — only for password inputs */}
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
          >
            {showPassword
              ? <EyeOff size={16} />
              : <Eye    size={16} />
            }
          </button>
        )}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}