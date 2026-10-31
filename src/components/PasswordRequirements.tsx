import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordRequirementsProps {
  password: string;
}

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({ password }) => {
  const requirements = [
    { label: 'More than 8 characters (min 9 chars)', met: password.length > 8 },
    { label: 'At least one uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'At least one lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { label: 'At least one special character (!@#$%^&*)', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];

  return (
    <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
      <div className="font-semibold text-slate-700 mb-1">Password Security Criteria:</div>
      {requirements.map((req, idx) => (
        <div key={idx} className="flex items-center space-x-2">
          {req.met ? (
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-700">
              <Check className="w-3 h-3 stroke-[3]" />
            </span>
          ) : (
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-slate-500">
              <X className="w-3 h-3 stroke-[3]" />
            </span>
          )}
          <span className={req.met ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
            {req.label}
          </span>
        </div>
      ))}
    </div>
  );
};

