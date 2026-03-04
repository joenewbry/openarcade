// DestructibleObject.cs

using UnityEngine;

public abstract class DestructibleObject : MonoBehaviour {
    [SerializeField] protected int maxHealth;
    protected int currentHealth;

    public virtual void TakeDamage(int damage) {
        currentHealth -= damage;
        if (currentHealth <= 0) {
            Destroy();
        }
    }

    protected abstract void Destroy();
}