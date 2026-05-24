import { SERVICE_STATUS } from '../config/providerServices';

export function calculateRoomInventory({ totalBeds = 0, availableBeds = 0, isActive = true }) {
  const safeTotal = Math.max(Number(totalBeds) || 0, 0);
  const safeAvailable = Math.max(Math.min(Number(availableBeds) || 0, safeTotal), 0);
  const occupiedBeds = Math.max(safeTotal - safeAvailable, 0);

  let status = SERVICE_STATUS.ACTIVE;
  if (!isActive) status = SERVICE_STATUS.PAUSED;
  else if (safeAvailable === 0 && safeTotal > 0) status = SERVICE_STATUS.FULL;

  return {
    totalBeds: safeTotal,
    availableBeds: safeAvailable,
    occupiedBeds,
    occupancyPercent: safeTotal ? Math.round((occupiedBeds / safeTotal) * 100) : 0,
    status,
    isVisible: status === SERVICE_STATUS.ACTIVE && safeAvailable > 0,
  };
}

export function getServiceVisibility({ status, isActive = true, availableBeds, totalBeds, serviceType }) {
  if (serviceType === 'PG') {
    return calculateRoomInventory({ totalBeds, availableBeds, isActive });
  }

  const derivedStatus = isActive ? (status || SERVICE_STATUS.ACTIVE) : SERVICE_STATUS.PAUSED;
  return {
    status: derivedStatus,
    isVisible: derivedStatus === SERVICE_STATUS.ACTIVE,
  };
}

export function statusLabel(status) {
  return {
    ACTIVE: 'Active',
    PAUSED: 'Paused',
    FULL: 'Full',
    DRAFT: 'Draft',
    HIDDEN: 'Hidden',
    CLOSED: 'Paused',
  }[status] || status || 'Draft';
}
