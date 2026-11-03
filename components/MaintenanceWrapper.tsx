'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import MaintenanceScreen from './MaintenanceScreen';

interface MaintenanceWrapperProps {
  children: React.ReactNode;
}

export default function MaintenanceWrapper({ children }: MaintenanceWrapperProps) {
  const pathname = usePathname();
  const [maintenance, setMaintenance] = useState<boolean>(false);
  const [whatsapp, setWhatsapp] = useState<string>('');
  const [storeName, setStoreName] = useState<string>('Use Peixoto');
  const [loading, setLoading] = useState<boolean>(true);

  // Skip maintenance screen completely if user is accessing /admin or /api
  const isAdminRoute = pathname?.startsWith('/admin') || pathname?.startsWith('/api');

  useEffect(() => {
    if (isAdminRoute) {
      setLoading(false);
      return;
    }

    const checkMaintenance = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          const isMaint = data.maintenance_mode === 'true' || data.maintenance_mode === '1';
          setMaintenance(isMaint);
          if (data.whatsapp_number) setWhatsapp(data.whatsapp_number);
          if (data.store_name) setStoreName(data.store_name);
        }
      } catch (e) {
        console.error('Error checking maintenance status:', e);
      } finally {
        setLoading(false);
      }
    };

    checkMaintenance();
  }, [isAdminRoute]);

  if (isAdminRoute) {
    return <>{children}</>;
  }

  if (!loading && maintenance) {
    return <MaintenanceScreen whatsapp={whatsapp} storeName={storeName} />;
  }

  return <>{children}</>;
}

