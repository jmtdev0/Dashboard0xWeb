'use client';

import { useEffect } from 'react';

export default function TestAlert() {
  useEffect(() => {
    alert('¡Hola! El deploy automático desde claude/develop-IHZW2 → develop está funcionando correctamente 🚀');
  }, []);

  return null;
}
