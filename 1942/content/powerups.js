export const POWERUPS = [
  {
    id: 'double-shot',
    label: 'Double Shot',
    color: '#ffd166',
    duration: 720,
    apply(state) {
      state.player.doubleShotTimer = this.duration;
    },
  },
  {
    id: 'speed-boost',
    label: 'Speed Boost',
    color: '#7cf3a2',
    duration: 600,
    apply(state) {
      state.player.speedBoostTimer = this.duration;
    },
  },
  {
    id: 'shield',
    label: 'Shield',
    color: '#89c2ff',
    duration: 540,
    apply(state) {
      state.player.shieldTimer = this.duration;
    },
  },
  {
    id: 'repair',
    label: 'Repair',
    color: '#ff9e7a',
    duration: 0,
    apply(state) {
      state.player.lives = Math.min(5, state.player.lives + 1);
    },
  },
  {
    id: 'bomb-pack',
    label: 'Bomb Pack',
    color: '#ffdf7f',
    duration: 0,
    apply(state) {
      state.player.bombs = Math.min(5, state.player.bombs + 2);
    },
  },
];

export function rollPowerup() {
  const weights = [25, 24, 20, 12, 19];
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < POWERUPS.length; i++) {
    r -= weights[i];
    if (r <= 0) return POWERUPS[i];
  }
  return POWERUPS[0];
}
