// IHitShield.cs
// Implement on components that can absorb incoming damage before HP is reduced.

public interface IHitShield
{
    bool IsShieldActive { get; }
    bool TryAbsorbHit(int incomingDamage);
}
