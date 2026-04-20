// import { useAuth } from '@/context/auth.context';

import { useAuth } from '@/context/AuthContext';

function getGreeting(name: string) {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${g}, ${name}`;
}

export function DashboardGreeting() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">
        {getGreeting(user?.firstName ?? 'there')} 👋
      </h1>
      <p className="text-sm text-muted-foreground mt-0.5">
        {user?.role?.name && <span className="font-medium text-foreground">{user.role.name}</span>}
        {user?.businessUnit?.name && (
          <span className="text-muted-foreground"> · {user.businessUnit.name}</span>
        )}
      </p>
    </div>
  );
}
