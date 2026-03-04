// DestructibleObject.cs

using UnityEngine;

public abstract class DestructibleObject : MonoBehaviour {
    [SerializeField] protected int maxHealth = 100;
    protected int currentHealth;

    protected virtual void Awake() {
        currentHealth = Mathf.Max(0, maxHealth);
    }

    public virtual void TakeDamage(int damage) {
        if (damage <= 0) {
            return;
        }

        if (TryAbsorbIncomingHit(damage)) {
            return;
        }

        currentHealth = Mathf.Max(0, currentHealth - damage);
        if (currentHealth <= 0) {
            Destroy();
        }
    }

    protected virtual bool TryAbsorbIncomingHit(int damage) {
        var shields = GetComponents<IHitShield>();
        foreach (var shield in shields) {
            if (shield != null && shield.TryAbsorbHit(damage)) {
                return true;
            }
        }

        return false;
    }

    public int GetCurrentHealth() {
        return currentHealth;
    }

    protected abstract void Destroy();
}
