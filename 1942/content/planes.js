export const PLANES = [
  {
    id: 'falcon',
    name: 'P-38 Falcon',
    color: '#8de8ff',
    speed: 4.2,
    fireRate: 9,
    rollCooldown: 80,
    special: {
      id: 'burst',
      name: 'Wing Burst',
      cooldown: 360,
      duration: 36,
      description: 'Fires a wide 5-shot spread for a short window.',
    },
  },
  {
    id: 'lancer',
    name: 'F4U Lancer',
    color: '#7ad5ff',
    speed: 3.9,
    fireRate: 8,
    rollCooldown: 72,
    special: {
      id: 'rail',
      name: 'Rail Strafe',
      cooldown: 420,
      duration: 1,
      description: 'Launches piercing rails that cut through enemies.',
    },
  },
  {
    id: 'specter',
    name: 'XP-59 Specter',
    color: '#9fb8ff',
    speed: 4.4,
    fireRate: 10,
    rollCooldown: 68,
    special: {
      id: 'phase',
      name: 'Phase Shield',
      cooldown: 480,
      duration: 120,
      description: 'Temporary shield that ignores damage and grazes bullets.',
    },
  },
  {
    id: 'atlas',
    name: 'B7 Atlas',
    color: '#9ee9c6',
    speed: 3.7,
    fireRate: 11,
    rollCooldown: 84,
    special: {
      id: 'emp',
      name: 'EMP Wave',
      cooldown: 450,
      duration: 1,
      description: 'Stuns nearby enemies and clears weak bullets.',
    },
  },
];

export function getPlaneById(id) {
  return PLANES.find((plane) => plane.id === id) || PLANES[0];
}
