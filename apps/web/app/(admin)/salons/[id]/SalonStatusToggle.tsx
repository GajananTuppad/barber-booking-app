'use client';

import { useState, useTransition } from 'react';
import { ConfirmDialog } from '../../../../components/ConfirmDialog';
import { setSalonActive } from '../../../../lib/admin-actions';

interface SalonStatusToggleProps {
  salonId: string;
  salonName: string;
  isActive: boolean;
}

export function SalonStatusToggle({ salonId, salonName, isActive }: SalonStatusToggleProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(() => {
      setSalonActive(salonId, !isActive).then(() => setOpen(false));
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`rounded-card border px-4 py-2 text-sm font-medium ${
          isActive ? 'border-danger text-danger' : 'border-success text-success'
        }`}
      >
        {isActive ? 'Suspend' : 'Approve'}
      </button>
      <ConfirmDialog
        open={open}
        title={isActive ? `Suspend ${salonName}?` : `Approve ${salonName}?`}
        description={
          isActive
            ? 'This salon and its barbers will be hidden from customers.'
            : 'This salon will become visible to customers again.'
        }
        destructive={isActive}
        loading={pending}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
