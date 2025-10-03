import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard,
  Users, 
  Target, 
  Building, 
  Phone, 
  Calendar,
  Megaphone,
  TrendingUp,

} from 'lucide-react';

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/services/crm',
    icon: LayoutDashboard,
    exact: true
  },
  {
    name: 'Leads',
    href: '/services/crm/leads',
    icon: Users
  },
  {
    name: 'Opportunities',
    href: '/services/crm/opportunities',
    icon: Target
  },
  {
    name: 'Accounts',
    href: '/services/crm/accounts',
    icon: Building
  },
  {
    name: 'Contacts',
    href: '/services/crm/contacts',
    icon: Phone
  },
  {
    name: 'Activities',
    href: '/services/crm/activities',
    icon: Calendar
  },
  {
    name: 'Campaigns',
    href: '/services/crm/campaigns',
    icon: Megaphone
  },
  {
    name: 'Reports',
    href: '/services/crm/reports',
    icon: TrendingUp
  }
];

export const CRMNavigation: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact 
              ? location.pathname === item.href
              : location.pathname.startsWith(item.href);

            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
};