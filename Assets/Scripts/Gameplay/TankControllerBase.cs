// TankControllerBase.cs

using UnityEngine;

public abstract class TankControllerBase : MonoBehaviour {
    [SerializeField] protected float moveSpeed;
    [SerializeField] protected float rotateSpeed;
    [SerializeField] protected float fireRate;

    protected float lastFireTime;

    public abstract void Move(Vector2 direction);
    public abstract void Rotate(float angle);
    public abstract void Fire();
    public abstract void UpdateControls();
}